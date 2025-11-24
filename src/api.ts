/**
 * The public CodeBase Relationship Visualization API
 */

import * as vscode from "vscode";

import { Visualization, type VisualizationState } from "./Visualization";
import { type VisualizationSettings } from "./VisualizationSettings";

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
	create(settings: Partial<VisualizationSettings>): Visualization {
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
export type { VisualizationSettings, VisualizationState };
