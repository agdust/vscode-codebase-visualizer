import { AnyFile, FileType } from "../types";

function isDirectory(file: AnyFile): boolean {
	if (file.type === FileType.Directory) {
		return true;
	}
	if (file.type === FileType.SymbolicLink && file.linkedType === FileType.Directory) {
		return true;
	}
	return false;
}

export function sortFiles(a: AnyFile, b: AnyFile): number {
	const aIsDir = isDirectory(a);
	const bIsDir = isDirectory(b);

	if (aIsDir && !bIsDir) {
		return -1;
	}
	if (!aIsDir && bIsDir) {
		return 1;
	}
	return a.name.localeCompare(b.name);
}

export function sortFileTree(root: AnyFile): void {
	if (root.type === FileType.Directory) {
		root.children.sort(sortFiles);
		root.children.forEach(sortFileTree);
	}
}
