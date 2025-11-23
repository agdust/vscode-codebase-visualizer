import * as vscode from "vscode";

import { API } from "./api";
import * as codebaseVisualization from "./visualizations/codebaseVisualization";

export async function activate(context: vscode.ExtensionContext) {
	const cbrvAPI = new API(context);

	await codebaseVisualization.activate(context);

	return cbrvAPI;
}
