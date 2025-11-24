import * as vscode from "vscode";
import { Uri, Webview, WebviewPanel, FileSystemWatcher, workspace } from "vscode";

import {
	WebviewVisualizationSettings,
	RepovisMessage,
	RepovisWebviewMessage,
	Directory,
} from "./types";
import * as fileHelper from "./util/fileHelper";
import { defaultSettings } from "./defaultSettings";
import { VisualizationSettings } from "./VisualizationSettings";
import { shallowCompare } from "./util/shallowCompare";
import { getWebviewHtml } from "./getWebviewHtml";

/**
 * A mutable "view" on a Visualization that can be used to update it.
 * This is used in the {@link Visualization.update} callback.
 */

export type VisualizationState = InstanceType<typeof Visualization.VisualizationState>;

/**
 * Creates, launches, and allows updating a visualization.
 */
export class Visualization {
	/** The URI of the root of the codebase this Visualization is visualizing. */
	public readonly codebase: Uri;

	private context: vscode.ExtensionContext;
	private originalSettings: Partial<VisualizationSettings>;
	private settings: VisualizationSettings;

	private webviewPanel: WebviewPanel;
	private fsWatcher?: FileSystemWatcher;

	private files: Uri[] = [];

	private onFilesChangeCallback?: (visState: VisualizationState) => Promise<void>;

	/** Construct a Visualization. You shouldn't call this directly, instead use {@link API.create} */
	constructor(
		context: vscode.ExtensionContext,
		codebase: Uri,
		settings: Partial<VisualizationSettings> = {},
	) {
		this.context = context;
		this.originalSettings = settings;
		this.settings = this.normalizeSettings(settings);
		this.codebase = codebase;
		this.webviewPanel = this.createWebviewPanel();

		this.init();
	}

	private async init() {
		// Await until we get the ready message from the webview
		await new Promise((resolve, reject) => {
			const disposable = this.webviewPanel.webview.onDidReceiveMessage(
				async (message: RepovisWebviewMessage) => {
					if (message.type === "ready") {
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
			async (message: RepovisWebviewMessage) => {
				if (message.type === "ready") {
					// we can get ready again if the webview closes and reopens.
					await this.sendSet({ codebase: true, settings: true });
				} else if (message.type === "open") {
					// NOTE: we could do these and Command URIs inside the webview instead. That might be simpler
					await vscode.commands.executeCommand("vscode.open", this.getUri(message.file));
				} else if (message.type === "reveal") {
					await vscode.commands.executeCommand(
						"revealInExplorer",
						this.getUri(message.file),
					);
				} else if (message.type === "update-settings") {
					if (message.settings.include !== undefined) {
						this.settings.include = message.settings.include;
					}
					if (message.settings.exclude !== undefined) {
						this.settings.exclude = message.settings.exclude;
					}

					if (
						message.settings.include !== undefined ||
						message.settings.exclude !== undefined
					) {
						await this.updateFileList();
						await this.sendSet({ codebase: true });
						if (this.onFilesChangeCallback) {
							this.update(this.onFilesChangeCallback);
						}
					}
				}
			},
			undefined,
			this.context.subscriptions,
		);
	}

	/** A mutable "view" on a Visualization */
	static VisualizationState = class {
		private visualization: Visualization;

		settings: Partial<VisualizationSettings>;

		constructor(visualization: Visualization) {
			this.visualization = visualization;
			this.settings = structuredClone(this.visualization.originalSettings);
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

		if (!shallowCompare(this.originalSettings, state.settings)) {
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
	get active(): boolean {
		return this.webviewPanel.active;
	}
	get viewColumn(): vscode.ViewColumn | undefined {
		return this.webviewPanel.viewColumn;
	}
	get visible(): boolean {
		return this.webviewPanel.visible;
	}
	reveal(viewColumn?: vscode.ViewColumn, preserveFocus?: boolean): void {
		this.webviewPanel.reveal(viewColumn, preserveFocus);
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
		const { include, exclude } = this.settings;
		this.files = await fileHelper.getFilteredFileList(
			this.codebase,
			include || "**/*",
			exclude,
		);
	}

	/** Returns a complete settings object with defaults filled in an normalized a bit.  */
	private normalizeSettings(
		settings: Partial<VisualizationSettings>,
	): VisualizationSettings {
		return { ...defaultSettings, ...settings };
	}

	/** Returns a complete settings object with defaults filled in an normalized a bit.  */
	private getWebviewSettings(): WebviewVisualizationSettings {
		const webviewSettings: WebviewVisualizationSettings = {
			include: this.settings.include,
			exclude: this.settings.exclude,
		};
		return webviewSettings;
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

		const inFiles = (uri: Uri) => {
			return this.files.some((u) => {
				return u.fsPath === uri.fsPath;
			});
		};

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
			"repositoryVisualizer",
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
		const styleUri = webview.asWebviewUri(
			Uri.joinPath(extPath, "dist", "webview", "webview.css"),
		);

		return getWebviewHtml(scriptUri.toString(), styleUri.toString());
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

	private async send(message: RepovisMessage) {
		await this.webviewPanel.webview.postMessage(message);
	}

	private getUri(file: string): Uri {
		return vscode.Uri.file(`${this.codebase.fsPath}/${file}`);
	}
}
