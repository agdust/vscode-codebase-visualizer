import { VisualizationSettings } from "./VisualizationSettings";


// contextMenuFile: [
// 	{
// 		title: "Reveal in Explorer",
// 		action: async (uri) =>
// 			await vscode.commands.executeCommand("revealInExplorer", uri),
// 	},
// 	{
// 		title: "Open in Editor",
// 		action: async (uri) => await vscode.commands.executeCommand("vscode.open", uri),
// 	},
// 	{
// 		title: "Copy Path",
// 		action: (uri) => vscode.env.clipboard.writeText(uri.fsPath),
// 	},
// 	{
// 		title: "Copy Relative Path",
// 		action: (uri, vis: Visualization) =>
// 			vscode.env.clipboard.writeText(path.relative(vis.codebase.fsPath, uri.fsPath)),
// 	},
// ],
// contextMenuDirectory: [
// 	{
// 		title: "Reveal in Explorer",
// 		action: async (uri) =>
// 			await vscode.commands.executeCommand("revealInExplorer", uri),
// 	},
// 	{
// 		title: "Copy Path",
// 		action: (uri) => vscode.env.clipboard.writeText(uri.fsPath),
// 	},
// 	{
// 		title: "Copy Relative Path",
// 		action: (uri, vis: Visualization) =>
// 			vscode.env.clipboard.writeText(path.relative(vis.codebase.fsPath, uri.fsPath)),
// 	},
// ],

export const defaultSettings: VisualizationSettings = {
	iconPath: null,
	title: "CodeBase Relationship Visualizer",
	include: "",
	exclude: "",
};
