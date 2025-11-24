import { FileType, AnyFile } from "../types";
import { getExtension } from "../util/getExtension";

export const isPathExcluded = (path: string, excludedPaths: Set<string>): boolean => {
	let currentPath = path;
	while (currentPath) {
		if (excludedPaths.has(currentPath)) {
			return true;
		}
		const lastSlash = currentPath.lastIndexOf("/");
		if (lastSlash === -1) {
			break;
		}
		currentPath = currentPath.substring(0, lastSlash);
	}
	return false;
};

export const createFilterPredicate = (
	excludedPaths: Set<string>,
	excludedExtensions: Set<string>,
) => {
	return (node: AnyFile, path: string): boolean => {
		// path is relative to root, but excludedPaths uses the same relative path format
		// constructed in FileTree.ts: const currentPath = path ? `${path}/${node.name}` : node.name;
		// filterFileTree passes path including the node name.
		if (isPathExcluded(path, excludedPaths)) {
			return false;
		}
		if (node.type === FileType.File && excludedExtensions.size > 0) {
			const ext = getExtension(node.name);
			return !excludedExtensions.has(ext);
		}
		return true;
	};
};
