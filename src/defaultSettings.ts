import * as vscode from "vscode";
import * as path from "path";
import { DeepRequired } from "ts-essentials";
import { VisualizationSettings } from "./Visualization";
import { Visualization } from "./Visualization";

export const defaultSettings: DeepRequired<VisualizationSettings> = {
	iconPath: null,
	title: "CodeBase Relationship Visualizer",
	filters: {
		include: "",
		exclude: "",
	},
	contextMenu: {
		file: [
			{
				title: "Reveal in Explorer",
				action: async (uri) =>
					await vscode.commands.executeCommand("revealInExplorer", uri),
			},
			{
				title: "Open in Editor",
				action: async (uri) => await vscode.commands.executeCommand("vscode.open", uri),
			},
			{
				title: "Copy Path",
				action: (uri) => vscode.env.clipboard.writeText(uri.fsPath),
			},
			{
				title: "Copy Relative Path",
				action: (uri, vis: Visualization) =>
					vscode.env.clipboard.writeText(path.relative(vis.codebase.fsPath, uri.fsPath)),
			},
		],
		directory: [
			{
				title: "Reveal in Explorer",
				action: async (uri) =>
					await vscode.commands.executeCommand("revealInExplorer", uri),
			},
			{
				title: "Copy Path",
				action: (uri) => vscode.env.clipboard.writeText(uri.fsPath),
			},
			{
				title: "Copy Relative Path",
				action: (uri, vis: Visualization) =>
					vscode.env.clipboard.writeText(path.relative(vis.codebase.fsPath, uri.fsPath)),
			},
		],
	},
};
