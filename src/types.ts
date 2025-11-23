/**
 * Just an alias for VSCode's FileType enum.
 * I've redeclared it from scratch here so that it can be used inside the webview (vscode isn't available there)
 */
export const FileType = {
	Unknown: 0,
	File: 1,
	Directory: 2,
	SymbolicLink: 64,
} as const;

export type FileType = (typeof FileType)[keyof typeof FileType];

/**
 * An abstract representation of files and directories that can be sent to the webview.
 */
export type AnyFile = File | Directory | SymbolicLink;

interface BaseFile {
	name: string;
}

export interface File extends BaseFile {
	type: typeof FileType.File;
	size: number;
}

export interface Directory extends BaseFile {
	type: typeof FileType.Directory;
	children: AnyFile[];
}

/**
 * Note that while VSCode handles SymbolicLink types as a bitmask with File or Directory, I'm spliting the bitmask into
 * separate fields to make it easier to work with and do type inference in the Visualization.
 */
export interface SymbolicLink extends BaseFile {
	type: typeof FileType.SymbolicLink;
	linkedType: typeof FileType.Directory | typeof FileType.File;
	link: string;
	resolved: string; // resolved path relative to your codebase, or full path if external.
}

export interface WebviewVisualizationSettings {
	include: string;
	exclude: string;
	contextMenuFile: WebviewContextMenuItem[];
	contextMenuDirectory: WebviewContextMenuItem[];
}

export type WebviewContextMenuItem = { title: string; action: string };

/** Messages the Visualization class will send to the webview */
export type CBRVMessage = SetMessage;
/** Messages the webview will send to the Visualization class */
export type CBRVWebviewMessage =
	| ReadyMessage
	| OpenMessage
	| RevealInExplorerMessage
	| ContextMenuActionMessage
	| UpdateSettings;

export type SetMessage = {
	type: "set";
	settings?: WebviewVisualizationSettings;
	codebase?: Directory;
};

export type ReadyMessage = { type: "ready" };
export type OpenMessage = { type: "open"; file: string };
export type RevealInExplorerMessage = { type: "reveal"; file: string };
export type ContextMenuActionMessage = {
	type: "context-menu";
	action: string;
	file: string;
};
export type UpdateSettings = {
	type: "update-settings";
	settings: Partial<WebviewVisualizationSettings>;
};
