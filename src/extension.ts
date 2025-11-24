import * as vscode from "vscode";

import { API } from "./api";
import { fileStructureVisualization } from "./visualizations/fileStructureVisualization";

export function activate(context: vscode.ExtensionContext): API {
	const repovisApi = new API(context);

	fileStructureVisualization.activate(context);

	return repovisApi;
}
