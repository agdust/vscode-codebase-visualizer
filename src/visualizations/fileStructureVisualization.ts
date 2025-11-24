import * as vscode from "vscode";

import { API } from "../api";

export const fileStructureVisualization = {
	activate(context: vscode.ExtensionContext): void {
		const repovisApi = new API(context);
		context.subscriptions.push(
			vscode.commands.registerCommand("repositoryVisualizer.start", () => {
				repovisApi.create({
					title: "File Structure Visualization",
				});
			}),
		);
	},
};
