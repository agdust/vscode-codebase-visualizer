import { describe, it, expect } from "vitest";

import { AnyFile, FileType } from "../src/types";
import { getExtension } from "../src/util/getExtension";
import { filterFileTree } from "../src/util/filterFileTree";
import { normalizedJSONStringify } from "../src/util/normalizedJSONStringify";
import { loopIndex } from "../src/util/loopIndex";

describe("Test utils.ts", () => {
	it("test getExtension", () => {
		expect(getExtension("a.txt")).toEqual("txt");
		expect(getExtension("path/to/a.txt.zip")).toEqual("zip");

		expect(getExtension("a/path/to/file")).toEqual("");
		expect(getExtension("a/path/folder.txt/file")).toEqual("");

		expect(getExtension("")).toEqual("");
		expect(getExtension(".gitignore")).toEqual("");
		expect(getExtension(".")).toEqual("");
		expect(getExtension("..")).toEqual("");
		expect(getExtension("a.")).toEqual("");
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
			expect(filterFileTree(tree, () => true)).toEqual(tree);
			expect(filterFileTree(tree, (f) => ["a", "b", "c"].includes(f.name))).toEqual({
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
			expect(filterFileTree(tree, () => false)).toEqual({
				name: "a",
				type: FileType.Directory,
				children: [],
			});
			expect(filterFileTree(empty, () => true)).toEqual(empty);
			expect(filterFileTree(empty, () => false)).toEqual(empty);
			expect(filterFileTree(file, () => true)).toEqual(file);
			expect(filterFileTree(file, () => false)).toEqual(file);
		});

		it("paths", () => {
			let paths: string[] = [];
			filterFileTree(tree, (_, path) => {
				paths.push(path);
				return true;
			});
			paths = paths.concat().sort();

			expect(paths).toEqual(["b", "b/c", "b/d", "e", "f"]);

			expect(filterFileTree(tree, () => false)).toEqual({
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
				filterFileTree(
					tree,
					(f) => f.type != FileType.Directory || f.children.length > 0,
				),
			).toEqual({
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

	it("test normalizedJSONStringify", () => {
		expect(normalizedJSONStringify(1)).toEqual("1");
		expect(normalizedJSONStringify("a")).toEqual('"a"');
		expect(normalizedJSONStringify(null)).toEqual("null");
		expect(normalizedJSONStringify([1, 2, 3])).toEqual("[1,2,3]");
		expect(normalizedJSONStringify({ a: 2, b: 1 })).toEqual('{"a":2,"b":1}');
		expect(normalizedJSONStringify({ b: 1, a: 2 })).toEqual('{"a":2,"b":1}');
		expect(normalizedJSONStringify({})).toEqual("{}");
		expect(
			normalizedJSONStringify({
				b: 1,
				a: { d: [1, 2, 3], c: null },
			}),
		).toEqual('{"a":{"c":null,"d":[1,2,3]},"b":1}');
	});

	it("test loopIndex", () => {
		expect(loopIndex(3, 5)).toEqual(3);
		expect(loopIndex(0, 5)).toEqual(0);
		expect(loopIndex(5, 5)).toEqual(0);
		expect(loopIndex(6, 5)).toEqual(1);
		expect(loopIndex(12, 5)).toEqual(2);
		expect(loopIndex(-1, 5)).toEqual(4);
		expect(loopIndex(-2, 5)).toEqual(3);
		expect(loopIndex(-5, 5)).toEqual(0);
		expect(loopIndex(-7, 5)).toEqual(3);
		expect(loopIndex(-12, 5)).toEqual(3);

		expect(loopIndex(0, 1)).toEqual(0);
		expect(loopIndex(1, 1)).toEqual(0);
		expect(loopIndex(-1, 1)).toEqual(0);

		expect(loopIndex(0, 0)).toEqual(NaN);
	});
});
