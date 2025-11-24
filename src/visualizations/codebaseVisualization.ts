import * as vscode from "vscode";

import { API } from "../api";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	const repovisApi = new API(context);
	context.subscriptions.push(
		vscode.commands.registerCommand("repositoryVisualizer.start", async () => {
			await repovisApi.create({
				title: "Codebase Visualization",
			});
		}),
	);
}
