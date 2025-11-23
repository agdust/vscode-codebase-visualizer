/**
 * The public CodeBase Relationship Visualization API
 */

import * as vscode from "vscode";

import {
	Visualization,
	type VisualizationSettings,
	type ContextMenuItem,
	type VisualizationState,
} from "./Visualization";

/**
 * This is the API that the CBRV VSCode extension will expose.
 *
 * To use, add `jesse-r-s-hines.codebase-relationship-visualizer` to your package.json `extensionDependencies` and then
 * import the api like so:
 *
 *  ```ts
 * let cbrvAPI = vscode.extensions.getExtension('jesse-r-s-hines.codebase-relationship-visualizer').exports;
 * let visualization = await cbrvAPI.create({
 *   // ...
 * })
 * ```
 *
 * See https://code.visualstudio.com/api/references/vscode-api#extensions
 */
export class API {
	context: vscode.ExtensionContext;
	constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}

	/**
	 * Creates a codebase visualization, and opens a window displaying it.
	 * @param settings Settings for the visualization
	 * @returns The {@link Visualization} object which can be used to update the visualization.
	 */
	async create(settings: VisualizationSettings): Promise<Visualization> {
		const codebase = vscode.workspace.workspaceFolders?.[0]?.uri;
		if (!codebase) {
			throw new Error("No workspace to visualize");
		}
		const vis = new Visualization(this.context, codebase, settings);
		return vis;
	}
}

// Re-export public types
export { Visualization };
export type { VisualizationSettings, ContextMenuItem, VisualizationState };
