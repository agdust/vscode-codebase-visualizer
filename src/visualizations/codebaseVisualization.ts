import * as vscode from "vscode";

import { API } from "../api";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	const cbrvAPI = new API(context);
	context.subscriptions.push(
		vscode.commands.registerCommand("codeBaseRelationshipVisualizer.start", async () => {
			await cbrvAPI.create({
				title: "Codebase Visualization",
			});
		}),
	);
}
