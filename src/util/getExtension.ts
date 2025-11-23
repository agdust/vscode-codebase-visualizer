/**
 * Returns the extension from a file name excluding the ".", or "" if there is none.
 * Hidden files count as having no extension.
 */
export function getExtension(filename: string): string {
	filename = filename.split("/").at(-1) as string; // remove any path
	const dotPos = filename.lastIndexOf(".");
	return dotPos > 0 ? filename.slice(dotPos + 1) : "";
}
