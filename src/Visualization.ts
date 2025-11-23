import * as vscode from "vscode";
import { Uri, Webview, WebviewPanel, FileSystemWatcher, workspace } from "vscode";
import * as path from "path";
import { DeepRequired } from "ts-essentials";
import _, { isEqual, cloneDeep } from "lodash";

import {
	WebviewVisualizationSettings,
	CBRVMessage,
	CBRVWebviewMessage,
	Directory,
} from "./types";
import * as fileHelper from "./util/fileHelper";

/**
 * A mutable "view" on a Visualization that can be used to update it.
 * This is used in the {@link Visualization.update} callback.
 */

export type VisualizationState = InstanceType<typeof Visualization.VisualizationState>;

/**
 * Settings and configuration for a Visualization.
 */
export interface VisualizationSettings {
	/**
	 * Icon for the webview panel. See https://code.visualstudio.com/api/references/vscode-api#WebviewPanel
	 */
	iconPath?: Uri | { dark: Uri; light: Uri } | null;

	/**
	 * Title for the internal webview. See https://code.visualstudio.com/api/references/vscode-api#WebviewPanel
	 */
	title?: string;

	/**
	 * The default filters on what files will show in the visualization.
	 * The user can still modify these defaults in the visualization.
	 */
	filters?: {
		/**
		 * Exclude files that match these comma separated glob patterns.
		 * Can be overridden by the user via the controls.
		 */
		exclude?: string;

		/**
		 * Include only files that match these comma separated glob patterns.
		 * Can be overridden by the user via the controls.
		 */
		include?: string;
	};

	/**
	 * Context menu options that will show for files and folders in addition to the default ones. Each `ContextMenuItem`
	 * contains a title and a callback that will be called with the Uri of the selected file or folder.
	 */
	contextMenu?: {
		file?: ContextMenuItem[];
		directory?: ContextMenuItem[];
	};
}

export type ContextMenuItem = {
	title: string;
	action: (uri: Uri, vis: Visualization) => void;
};

/**
 * Creates, launches, and allows updating a CBRV visualization.
 */
export class Visualization {
	/** The URI of the root of the codebase this Visualization is visualizing. */
	public readonly codebase: Uri;

	private context: vscode.ExtensionContext;
	private originalSettings: VisualizationSettings;
	private settings: DeepRequired<VisualizationSettings>;

	private webviewPanel?: WebviewPanel;
	private fsWatcher?: FileSystemWatcher;

	private files: Uri[] = [];

	private onFilesChangeCallback?: (visState: VisualizationState) => Promise<void>;

	private static readonly defaultSettings: DeepRequired<VisualizationSettings> = {
		iconPath: null,
		title: "CodeBase Relationship Visualizer",
		filters: {
			include: "",
			exclude: "",
		},
		contextMenu: {
			file: [
				{
					title: "Reveal in Explorer",
					action: async (uri) =>
						await vscode.commands.executeCommand("revealInExplorer", uri),
				},
				{
					title: "Open in Editor",
					action: async (uri) => await vscode.commands.executeCommand("vscode.open", uri),
				},
				{
					title: "Copy Path",
					action: (uri) => vscode.env.clipboard.writeText(uri.fsPath),
				},
				{
					title: "Copy Relative Path",
					action: (uri, vis) =>
						vscode.env.clipboard.writeText(
							path.relative(vis.codebase.fsPath, uri.fsPath),
						),
				},
			],
			directory: [
				{
					title: "Reveal in Explorer",
					action: async (uri) =>
						await vscode.commands.executeCommand("revealInExplorer", uri),
				},
				{
					title: "Copy Path",
					action: (uri) => vscode.env.clipboard.writeText(uri.fsPath),
				},
				{
					title: "Copy Relative Path",
					action: (uri, vis) =>
						vscode.env.clipboard.writeText(
							path.relative(vis.codebase.fsPath, uri.fsPath),
						),
				},
			],
		},
	};

	/** Construct a Visualization. You shouldn't call this directly, instead use {@link API.create} */
	constructor(
		context: vscode.ExtensionContext,
		codebase: Uri,
		settings: VisualizationSettings = {},
	) {
		this.context = context;
		this.originalSettings = settings;
		this.settings = this.normalizeSettings(settings);
		this.codebase = codebase;
	}

	/** A mutable "view" on a Visualization */
	static VisualizationState = class {
		private visualization: Visualization;

		settings: VisualizationSettings;

		constructor(visualization: Visualization) {
			this.visualization = visualization;
			this.settings = cloneDeep(this.visualization.originalSettings);
		}

		/** The root of the codebase we are visualizing */
		get codebase(): Uri {
			return this.visualization.codebase;
		}

		/** Get a list of all the files included by the current include/exclude settings. */
		get files(): Uri[] {
			return this.visualization.files;
		}
	};

	/**
	 * Used to update the visualization. Update the state in the callback and the visualization will update after
	 * calling the callback.
	 */
	async update(func: (visState: VisualizationState) => Promise<void>): Promise<void> {
		const state = new Visualization.VisualizationState(this);
		await func(state); // user can mutate settings and connections in here

		const send = { settings: false };

		if (!isEqual(this.originalSettings, state.settings)) {
			this.originalSettings = state.settings;
			this.settings = this.normalizeSettings(state.settings);
			if (this.webviewPanel) {
				this.webviewPanel.iconPath = this.settings.iconPath ?? undefined;
				this.webviewPanel.title = this.settings.title;
			}
			send.settings = true;
		}

		await this.sendSet(send);
	}

	/**
	 * Set the callback to update the visualization whenever the filelist change. It will trigger if a file is created,
	 * modified, or deleted, or if the filters change. Most the time, you'll want to use this instead of using
	 * {@link update} directly.
	 *
	 * You can pass `{immediate: true}` if you want it to trigger immediately as well.
	 */
	onFilesChange(
		func: (visState: VisualizationState) => Promise<void>,
		options?: { immediate?: boolean },
	): void {
		this.onFilesChangeCallback = func;
		if (options?.immediate ?? false) {
			this.update(this.onFilesChangeCallback);
		}
	}

	/**
	 * These properties and methods are just passed through to the internal webview panel.
	 * See https://code.visualstudio.com/api/references/vscode-api#WebviewPanel
	 */
	get active() {
		return this.webviewPanel!.active;
	}
	get viewColumn() {
		return this.webviewPanel!.viewColumn;
	}
	get visible() {
		return this.webviewPanel!.visible;
	}
	reveal(viewColumn?: vscode.ViewColumn, preserveFocus?: boolean): void {
		this.webviewPanel!.reveal(viewColumn, preserveFocus);
	}

	/**
	 * Open up the visualizing in the webview.
	 * You shouldn't call this directly, `API.create` launches automatically.
	 */
	async launch() {
		if (this.webviewPanel) {
			throw new Error("Visualization launched twice");
		}
		this.webviewPanel = this.createWebviewPanel();

		// Await until we get the ready message from the webview
		await new Promise((resolve, reject) => {
			const disposable = this.webviewPanel!.webview.onDidReceiveMessage(
				async (message: CBRVWebviewMessage) => {
					if (message.type == "ready") {
						disposable.dispose();
						resolve(undefined);
					} else {
						reject(new Error('First message should be "ready"'));
					}
				},
			);
		});

		await this.updateFileList();
		await this.sendSet({ codebase: true, settings: true });
		this.setupWatcher();

		this.webviewPanel.webview.onDidReceiveMessage(
			async (message: CBRVWebviewMessage) => {
				if (message.type == "ready") {
					// we can get ready again if the webview closes and reopens.
					await this.sendSet({ codebase: true, settings: true });
				} else if (message.type == "open") {
					// NOTE: we could do these and Command URIs inside the webview instead. That might be simpler
					await vscode.commands.executeCommand("vscode.open", this.getUri(message.file));
				} else if (message.type == "reveal") {
					await vscode.commands.executeCommand(
						"revealInExplorer",
						this.getUri(message.file),
					);
				} else if (message.type == "update-settings") {
					this.settings = _.merge({}, this.settings, message.settings);
					const filters = message.settings.filters;
					if (filters?.include != undefined || filters?.exclude != undefined) {
						await this.updateFileList();
						await this.sendSet({ codebase: true });
						if (this.onFilesChangeCallback) {
							this.update(this.onFilesChangeCallback);
						}
					}
				} else if (message.type == "context-menu") {
					const [menu, i] = message.action.split("-");
					const uri = this.getUri(message.file);
					this.settings.contextMenu[menu as "file" | "directory"][Number(i)].action(
						uri,
						this,
					);
				}
			},
			undefined,
			this.context.subscriptions,
		);
	}

	/** Destroy the visualization and all webviews/watchers etc. */
	dispose(): void {
		// TODO make Visualization return or implement Disposable?
		this.webviewPanel?.dispose();
		this.fsWatcher?.dispose();
	}

	/**
	 * Updates the Visualization after the codebase or include/exclude settings have changed.
	 */
	private async updateFileList(): Promise<void> {
		const { include, exclude } = this.settings.filters;
		this.files = await fileHelper.getFilteredFileList(
			this.codebase,
			include || "**/*",
			exclude,
		);
	}

	/** Returns a complete settings object with defaults filled in an normalized a bit.  */
	private normalizeSettings(
		settings: VisualizationSettings,
	): DeepRequired<VisualizationSettings> {
		settings = cloneDeep(settings);
		// prepend defaults to menu items (if they are specified)
		if (settings.contextMenu?.file)
			settings.contextMenu.file.splice(
				0,
				0,
				...Visualization.defaultSettings.contextMenu.file,
			);
		if (settings.contextMenu?.directory)
			settings.contextMenu.directory.splice(
				0,
				0,
				...Visualization.defaultSettings.contextMenu.directory,
			);

		settings = _.merge({}, Visualization.defaultSettings, settings);

		return settings as DeepRequired<VisualizationSettings>;
	}

	/** Returns a complete settings object with defaults filled in an normalized a bit.  */
	private getWebviewSettings(): WebviewVisualizationSettings {
		const webviewSettings = {
			..._.omit(this.settings, ["iconPath", "title", "contextMenu"]),
			contextMenu: {
				file: this.settings.contextMenu.file.map((item, i) => ({
					...item,
					action: `file-${i}`,
				})),
				directory: this.settings.contextMenu.directory.map((item, i) => ({
					...item,
					action: `directory-${i}`,
				})),
			},
		};
		return webviewSettings as WebviewVisualizationSettings;
	}

	private setupWatcher() {
		// TODO VSCode watcher may be ignoring some file trees like node_modules by default.
		this.fsWatcher = workspace.createFileSystemWatcher(
			// Watch entire codebase. The workspace is watched by default, so it shouldn't be a performance
			// issue to add a broad watcher for it since it will just use the default watcher. We'll check
			// include/exclude the callback.
			new vscode.RelativePattern(this.codebase, "**/*"),
		);

		const callback = async () => {
			await this.sendSet({ codebase: true });
			if (this.onFilesChangeCallback) {
				this.update(this.onFilesChangeCallback);
			}
		};

		const inFiles = (uri: Uri) => this.files.some((u) => u.fsPath == uri.fsPath);

		this.fsWatcher.onDidChange(async (uri) => {
			if (inFiles(uri)) {
				await callback();
				// don't need to update file list
			}
		});
		this.fsWatcher.onDidCreate(async (uri) => {
			await this.updateFileList();
			if (inFiles(uri)) {
				callback(); // check if in new file list
			}
		});
		this.fsWatcher.onDidDelete(async (uri) => {
			if (inFiles(uri)) {
				// check if in original file list
				await this.updateFileList();
				callback();
			}
		});
	}

	private createWebviewPanel(): WebviewPanel {
		// Create and show panel
		const panel = vscode.window.createWebviewPanel(
			"codeBaseRelationshipVisualizer",
			this.settings.title,
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.file(this.context.extensionPath)],
				// enableCommandUris: true,
			},
		);
		panel.iconPath = this.settings.iconPath ?? undefined;

		panel.webview.html = this.getWebviewContent(panel.webview);

		return panel;
	}

	private getWebviewContent(webview: Webview): string {
		const extPath = vscode.Uri.file(this.context.extensionPath);
		const scriptUri = webview.asWebviewUri(
			Uri.joinPath(extPath, "dist", "webview", "webview.js"),
		);

		return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CodeBase Relationship Visualizer</title>
            </head>
            <body>
                <div id="filters">
                    <div class="form-input" style="flex-grow: 1; max-width: 20em">
                        <label for="include">Files to include</label>
                        <input id="include" title="e.g. **/*.ts, src/**/include"></input>
                    </div>
                    <div class="form-input" style="flex-grow: 1; max-width: 20em">
                        <label for="exclude">Files to exclude</label>
                        <input id="exclude" title="e.g. **/*.ts, src/**/include"></input>
                    </div>
                </div>
                <svg id="diagram"></svg>
                <script>var exports = {}</script>
                <script src="${scriptUri}"></script>
            </body>
            </html>
        `;
	}

	private async sendSet(send: { codebase?: boolean; settings?: boolean }) {
		let codebase: Directory | undefined;
		if (send.codebase) {
			codebase = await fileHelper.listToFileTree(this.codebase, this.files);
		}

		let settings: WebviewVisualizationSettings | undefined;
		if (send.settings) {
			settings = this.getWebviewSettings();
		}

		await this.send({ type: "set", settings, codebase });
	}

	private async send(message: CBRVMessage) {
		await this.webviewPanel!.webview.postMessage(message);
	}

	private getUri(file: string): Uri {
		return vscode.Uri.file(`${this.codebase.fsPath}/${file}`);
	}
}
