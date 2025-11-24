import { expect } from "chai";
import { describe, it } from "mocha";

import { AnyFile, FileType } from "../src/types";
import { getExtension } from "../src/util/getExtension";
import { filterFileTree } from "../src/util/filterFileTree";
import { normalizedJsonStringify } from "../src/util/normalizedJsonStringify";
import { sortFiles } from "../src/util/sortFiles";

describe("Test utils.ts", () => {
	it("test getExtension", () => {
		expect(getExtension("a.txt")).to.equal("txt");
		expect(getExtension("path/to/a.txt.zip")).to.equal("zip");

		expect(getExtension("a/path/to/file")).to.equal("");
		expect(getExtension("a/path/folder.txt/file")).to.equal("");

		expect(getExtension("")).to.equal("");
		expect(getExtension(".gitignore")).to.equal("");
		expect(getExtension(".")).to.equal("");
		expect(getExtension("..")).to.equal("");
		expect(getExtension("a.")).to.equal("");
	});

	describe("test filterFileTree", () => {
		const tree: AnyFile = {
			name: "a",
			type: FileType.Directory,
			children: [
				{
					name: "b",
					type: FileType.Directory,
					children: [
						{ name: "c", type: FileType.File, size: 1 },
						{ name: "d", type: FileType.File, size: 2 },
					],
				},
				{ name: "e", type: FileType.File, size: 3 },
				{ name: "f", type: FileType.Directory, children: [] },
			],
		};
		const empty: AnyFile = { name: "empty", type: FileType.Directory, children: [] };
		const file: AnyFile = { name: "empty", type: FileType.File, size: 4 };

		it("basic", () => {
			expect(
				filterFileTree(tree, () => {
					return true;
				}),
			).to.deep.equal(tree);
			expect(
				filterFileTree(tree, (f) => {
					return ["a", "b", "c"].includes(f.name);
				}),
			).to.deep.equal({
				name: "a",
				type: FileType.Directory,
				children: [
					{
						name: "b",
						type: FileType.Directory,
						children: [{ name: "c", type: FileType.File, size: 1 }],
					},
				],
			});
		});

		it("can't remove root node", () => {
			expect(
				filterFileTree(tree, () => {
					return false;
				}),
			).to.deep.equal({
				name: "a",
				type: FileType.Directory,
				children: [],
			});
			expect(
				filterFileTree(empty, () => {
					return true;
				}),
			).to.deep.equal(empty);
			expect(
				filterFileTree(empty, () => {
					return false;
				}),
			).to.deep.equal(empty);
			expect(
				filterFileTree(file, () => {
					return true;
				}),
			).to.deep.equal(file);
			expect(
				filterFileTree(file, () => {
					return false;
				}),
			).to.deep.equal(file);
		});

		it("paths", () => {
			const paths: string[] = [];
			filterFileTree(tree, (_, path) => {
				paths.push(path);
				return true;
			});
			paths.sort((a, b) => {
				return a.localeCompare(b);
			});

			expect(paths).to.deep.equal(["b", "b/c", "b/d", "e", "f"]);

			expect(
				filterFileTree(tree, () => {
					return false;
				}),
			).to.deep.equal({
				name: "a",
				type: FileType.Directory,
				children: [],
			});
		});

		it("execution order", () => {
			const tree: AnyFile = {
				name: "A",
				type: FileType.Directory,
				children: [
					{
						name: "B",
						type: FileType.Directory,
						children: [{ name: "c", type: FileType.File, size: 1 }],
					},
					{
						name: "C",
						type: FileType.Directory,
						children: [
							{
								name: "D",
								type: FileType.Directory,
								children: [],
							},
						],
					},
				],
			};

			expect(
				filterFileTree(tree, (f) => {
					return f.type !== FileType.Directory || f.children.length > 0;
				}),
			).to.deep.equal({
				name: "A",
				type: FileType.Directory,
				children: [
					{
						name: "B",
						type: FileType.Directory,
						children: [{ name: "c", type: FileType.File, size: 1 }],
					},
					// both C and D should be filtered because D is empty
				],
			});
		});
	});

	describe("test sortFiles", () => {
		const dirA: AnyFile = { name: "a", type: FileType.Directory, children: [] };
		const dirB: AnyFile = { name: "b", type: FileType.Directory, children: [] };
		const fileA: AnyFile = { name: "a.txt", type: FileType.File, size: 1 };
		const fileB: AnyFile = { name: "b.txt", type: FileType.File, size: 1 };
		const symlinkDir: AnyFile = {
			name: "linkDir",
			type: FileType.SymbolicLink,
			linkedType: FileType.Directory,
			link: "",
			resolved: "",
		};
		const symlinkFile: AnyFile = {
			name: "linkFile",
			type: FileType.SymbolicLink,
			linkedType: FileType.File,
			link: "",
			resolved: "",
		};

		it("sorts directories before files", () => {
			expect(sortFiles(dirA, fileA)).to.equal(-1);
			expect(sortFiles(fileA, dirA)).to.equal(1);
		});

		it("sorts alphabetically within same type", () => {
			expect(sortFiles(dirA, dirB)).to.be.lessThan(0);
			expect(sortFiles(fileA, fileB)).to.be.lessThan(0);
		});

		it("treats symlink to directory as directory", () => {
			expect(sortFiles(symlinkDir, fileA)).to.equal(-1);
			expect(sortFiles(symlinkDir, dirA)).to.be.greaterThan(0); // "linkDir" > "a"
		});

		it("treats symlink to file as file", () => {
			expect(sortFiles(symlinkFile, dirA)).to.equal(1);
			expect(sortFiles(symlinkFile, fileA)).to.be.greaterThan(0); // "linkFile" > "a.txt"
		});
	});

	it("test normalizedJsonStringify", () => {
		expect(normalizedJsonStringify(1)).to.equal("1");
		expect(normalizedJsonStringify("a")).to.equal('"a"');
		expect(normalizedJsonStringify(null)).to.equal("null");
		expect(normalizedJsonStringify([1, 2, 3])).to.equal("[1,2,3]");
		expect(normalizedJsonStringify({ a: 2, b: 1 })).to.equal('{"a":2,"b":1}');
		expect(normalizedJsonStringify({ b: 1, a: 2 })).to.equal('{"a":2,"b":1}');
		expect(normalizedJsonStringify({})).to.equal("{}");
		expect(
			normalizedJsonStringify({
				b: 1,
				a: { d: [1, 2, 3], c: null },
			}),
		).to.equal('{"a":{"c":null,"d":[1,2,3]},"b":1}');
	});
});
