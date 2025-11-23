import { Uri } from "vscode";
import { Visualization } from "./Visualization";

/**
 * Settings and configuration for a Visualization.
 */
export interface VisualizationSettings {
	/**
	 * Icon for the webview panel. See https://code.visualstudio.com/api/references/vscode-api#WebviewPanel
	 */
	iconPath: Uri | { dark: Uri; light: Uri } | null;

	/**
	 * Title for the internal webview. See https://code.visualstudio.com/api/references/vscode-api#WebviewPanel
	 */
	title: string;

	/**
	 * Exclude files that match these comma separated glob patterns.
	 * Can be overridden by the user via the controls.
	 */
	exclude: string;

	/**
	 * Include only files that match these comma separated glob patterns.
	 * Can be overridden by the user via the controls.
	 */
	include: string;

	/**
	 * Context menu options that will show for files and folders in addition to the default ones. Each `ContextMenuItem`
	 * contains a title and a callback that will be called with the Uri of the selected file or folder.
	 */
	contextMenuFile: ContextMenuItem[];
	contextMenuDirectory: ContextMenuItem[];
}

export type ContextMenuItem = {
	title: string;
	action: (uri: Uri, vis: Visualization) => void;
};
