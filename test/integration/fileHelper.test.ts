import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import * as vscode from "vscode";
import { Uri } from "vscode";

use(chaiAsPromised);
import * as path from "path";

import { AnyFile, Directory, FileType } from "../../src/types";
import * as fileHelper from "../../src/util/fileHelper";
import { deepEqual } from "../../src/util/deepEqual";
import { writeFileTree } from "./integrationHelpers";
import { describe, it } from "mocha";

// I can't find a built-in way to get workspaceFolder. __dirname is .../repovis/dist/test/test/integration
const workspaceFolder = Uri.file(
	[0, 1, 2, 3].reduce((p) => {
		return path.dirname(p);
	}, __dirname),
);
const samples = Uri.joinPath(workspaceFolder, "/test/sample-repos");
const minimal = Uri.joinPath(samples, "minimal");
const symlinks = Uri.joinPath(samples, "symlinks");

const minimalContents: Directory = {
	name: "minimal",
	type: FileType.Directory,
	children: [
		{
			name: "A",
			type: FileType.Directory,
			children: [
				{ name: "E.txt", size: 1828, type: FileType.File },
				{ name: "F.txt", size: 630, type: FileType.File },
				{ name: "G.md", size: 124, type: FileType.File },
			],
		},
		{
			name: "deoxyribonucleicAcid",
			type: FileType.Directory,
			children: [{ name: "I", size: 1, type: FileType.File }],
		},
		{ name: "C.txt", size: 1117, type: FileType.File },
		{ name: "D.md", size: 841, type: FileType.File },
		{ name: "Supercalifragilisticexpialidocious.py", size: 44, type: FileType.File },
	],
};

const symlinkContents: Directory = {
	name: "symlinks",
	type: FileType.Directory,
	children: [
		{
			name: "A",
			type: FileType.Directory,
			children: [{ name: "E.txt", type: FileType.File, size: 1828 }],
		},
		{
			name: "external",
			type: FileType.SymbolicLink,
			linkedType: FileType.Directory,
			link: "../minimal/deoxyribonucleicAcid/",
			resolved: Uri.joinPath(samples, "minimal/deoxyribonucleicAcid").fsPath,
		},
		{
			name: "link",
			type: FileType.SymbolicLink,
			linkedType: FileType.Directory,
			link: "A",
			resolved: "A",
		},
		{
			name: "linklink",
			type: FileType.SymbolicLink,
			linkedType: FileType.Directory,
			link: "link",
			resolved: "A",
		},
		{
			name: "loop",
			type: FileType.Directory,
			children: [
				{
					name: "loop",
					type: FileType.SymbolicLink,
					linkedType: FileType.Directory,
					link: ".",
					resolved: "loop",
				},
				{ name: "file.md", type: FileType.File, size: 12 },
			],
		},
		{ name: "B.md", type: FileType.File, size: 870 },
		{ name: "C.md", type: FileType.File, size: 13 },
		{
			name: "external.md",
			type: FileType.SymbolicLink,
			linkedType: FileType.File,
			link: "../minimal/D.md",
			resolved: Uri.joinPath(samples, "minimal/D.md").fsPath, // full path since external
		},
		{
			name: "external2.md",
			type: FileType.SymbolicLink,
			linkedType: FileType.File,
			link: "../minimal/D.md",
			resolved: Uri.joinPath(samples, "minimal/D.md").fsPath, // full path since external
		},
		{
			name: "externalNested.txt",
			type: FileType.SymbolicLink,
			linkedType: FileType.File,
			link: "../minimal/deoxyribonucleicAcid/I",
			resolved: Uri.joinPath(samples, "minimal/deoxyribonucleicAcid/I").fsPath, // full path since external
		},
		{
			name: "link.md",
			type: FileType.SymbolicLink,
			linkedType: FileType.File,
			link: "B.md",
			resolved: "B.md",
		},
		{
			name: "linklink.md",
			linkedType: FileType.File,
			type: FileType.SymbolicLink,
			link: "link.md",
			resolved: "B.md",
		},
		// NOTE: the brokenLink.html link will just get omitted.
	],
};

function expectTree(actual: AnyFile, expected: AnyFile) {
	// Size can vary a bit by platform (line endings) so don't compare it directly
	const stripFields = (file: AnyFile): unknown => {
		if (file.type === FileType.Directory) {
			return {
				...file,
				children: file.children.map((c) => {
					return stripFields(c);
				}),
			};
		}
		if (file.type === FileType.File) {
			const { size: _, ...result } = file;
			return result;
		}
		const { link: _, resolved: __, ...result } = file;
		return result;
	};
	// do a normal expect so we get nice error messages for simple errors
	expect(stripFields(actual)).to.deep.equal(stripFields(expected));

	// check that sizes are close to what we expected and symlinks paths match
	const areEqual = deepEqual(actual, expected, (a, b, key) => {
		if (key === "size") {
			return Math.abs((b as number) - (a as number)) < (b as number) * 0.1;
		} else if (key === "link") {
			return (
				(a as string).split(path.sep).join("/").toLocaleLowerCase() ===
				(b as string).split(path.sep).join("/").toLocaleLowerCase()
			);
		} else if (key === "resolved") {
			return (a as string).toLocaleLowerCase() === (b as string).toLocaleLowerCase();
		} else {
			return undefined;
		}
	});
	expect(areEqual, "expect file trees to be the same").to.equal(true);
}

describe("Test fileHelper", () => {
	it("getFileTree", async () => {
		let tree = await fileHelper.getFileTree(minimal);
		expectTree(tree, minimalContents);

		const empty = await writeFileTree({});
		tree = await fileHelper.getFileTree(empty);
		expectTree(tree, { type: FileType.Directory, name: tree.name, children: [] });

		tree = await fileHelper.getFileTree(symlinks);
		expectTree(tree, symlinkContents);
	});

	it("listToFileTree", async () => {
		let fileList = await vscode.workspace.findFiles(
			new vscode.RelativePattern(minimal, "**/*"),
		);
		let tree = await fileHelper.listToFileTree(minimal, fileList);
		expectTree(tree, minimalContents);

		const empty = await writeFileTree({});
		tree = await fileHelper.listToFileTree(empty, []);
		expectTree(tree, { type: FileType.Directory, name: tree.name, children: [] });

		fileList = [Uri.joinPath(minimal, "A")];
		tree = await fileHelper.listToFileTree(minimal, fileList);
		expectTree(tree, {
			type: FileType.Directory,
			name: "minimal",
			children: [{ type: FileType.Directory, name: "A", children: [] }],
		});

		fileList = [Uri.joinPath(minimal, "A/E.txt")];
		tree = await fileHelper.listToFileTree(minimal, fileList);
		expectTree(tree, {
			type: FileType.Directory,
			name: "minimal",
			children: [
				{
					type: FileType.Directory,
					name: "A",
					children: [{ type: FileType.File, name: "E.txt", size: 1828 }],
				},
			],
		});

		await expect(fileHelper.listToFileTree(minimal, [minimal])).to.be.rejectedWith(
			/".*sample-repos[\\/]minimal" is not under ".*sample-repos[\\/]minimal"/,
		);
		await expect(fileHelper.listToFileTree(minimal, [samples])).to.be.rejectedWith(
			/".*sample-repos" is not under ".*sample-repos[\\/]minimal"/,
		);

		fileList = await vscode.workspace.findFiles(
			new vscode.RelativePattern(symlinks, "**/*"),
		);
		const expected = structuredClone(symlinkContents);
		const loop = expected.children.find((c) => {
			return c.name === "loop";
		}) as Directory;
		loop.children = loop.children.filter((c) => {
			return c.name !== "loop";
		}); // findFiles doesn't traverse the loop
		tree = await fileHelper.listToFileTree(symlinks, fileList);
		expectTree(tree, expected);
	});

	it("getFilteredFileList and getFilteredFileListTree", async () => {
		const minimalContentsList = [
			"A/E.txt",
			"A/F.txt",
			"A/G.md",
			"C.txt",
			"D.md",
			"deoxyribonucleicAcid/I",
			"Supercalifragilisticexpialidocious.py",
		].map((u) => {
			return Uri.joinPath(minimal, u).fsPath;
		});

		let list = await fileHelper.getFilteredFileList(minimal, "**/*");
		expect(
			list.map((u) => {
				return u.fsPath;
			}),
		).to.deep.equal(minimalContentsList);

		list = await fileHelper.getFilteredFileList(minimal, "**/*", " "); // should be trimmed and ignored
		expect(
			list.map((u) => {
				return u.fsPath;
			}),
		).to.deep.equal(minimalContentsList);

		let tree = await fileHelper.getFilteredFileTree(minimal, "**/*");
		expectTree(tree, minimalContents);

		tree = await fileHelper.getFilteredFileTree(minimal, "A/*");
		expectTree(tree, {
			name: "minimal",
			type: FileType.Directory,
			children: [
				{
					name: "A",
					type: FileType.Directory,
					children: [
						{ name: "E.txt", size: 1828, type: FileType.File },
						{ name: "F.txt", size: 630, type: FileType.File },
						{ name: "G.md", size: 124, type: FileType.File },
					],
				},
			],
		});

		tree = await fileHelper.getFilteredFileTree(minimal, "**/*", "A");

		tree = await fileHelper.getFilteredFileTree(minimal, "**/*", "A, *.txt");
		expectTree(tree, {
			name: "minimal",
			type: FileType.Directory,
			children: [
				{
					name: "deoxyribonucleicAcid",
					type: FileType.Directory,
					children: [{ name: "I", size: 1, type: FileType.File }],
				},
				{ name: "D.md", size: 841, type: FileType.File },
				{ name: "Supercalifragilisticexpialidocious.py", size: 44, type: FileType.File },
			],
		});

		// tree = await fileHelper.getFilteredFileList(minimal, 'A/{E,F}.txt')
		// tree = await fileHelper.getFilteredFileList(minimal, 'A/*.{txt,md}, D.md')

		tree = await fileHelper.getFilteredFileTree(symlinks, "A/**");
		expectTree(tree, {
			name: "symlinks",
			type: FileType.Directory,
			children: [
				{
					name: "A",
					type: FileType.Directory,
					children: [{ name: "E.txt", size: 1828, type: FileType.File }],
				},
			],
		});

		tree = await fileHelper.getFilteredFileTree(symlinks, "A/**, link/**");
		expectTree(tree, {
			name: "symlinks",
			type: FileType.Directory,
			children: [
				{
					name: "A",
					type: FileType.Directory,
					children: [{ name: "E.txt", size: 1828, type: FileType.File }],
				},
				{
					name: "link",
					type: FileType.SymbolicLink,
					linkedType: FileType.Directory,
					link: "A",
					resolved: "A",
				},
			],
		});
	});
});
