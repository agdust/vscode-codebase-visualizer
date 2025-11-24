import { expect } from "chai";
import { describe, it } from "mocha";

import { AnyFile, FileType } from "../src/types";
import { getExtension } from "../src/util/getExtension";
import { filterFileTree } from "../src/util/filterFileTree";
import { normalizedJsonStringify } from "../src/util/normalizedJsonStringify";

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
			expect(filterFileTree(tree, () => true)).to.deep.equal(tree);
			expect(filterFileTree(tree, (f) => ["a", "b", "c"].includes(f.name))).to.deep.equal(
				{
					name: "a",
					type: FileType.Directory,
					children: [
						{
							name: "b",
							type: FileType.Directory,
							children: [{ name: "c", type: FileType.File, size: 1 }],
						},
					],
				},
			);
		});

		it("can't remove root node", () => {
			expect(filterFileTree(tree, () => false)).to.deep.equal({
				name: "a",
				type: FileType.Directory,
				children: [],
			});
			expect(filterFileTree(empty, () => true)).to.deep.equal(empty);
			expect(filterFileTree(empty, () => false)).to.deep.equal(empty);
			expect(filterFileTree(file, () => true)).to.deep.equal(file);
			expect(filterFileTree(file, () => false)).to.deep.equal(file);
		});

		it("paths", () => {
			const paths: string[] = [];
			filterFileTree(tree, (_, path) => {
				paths.push(path);
				return true;
			});
			paths.sort((a, b) => a.localeCompare(b));

			expect(paths).to.deep.equal(["b", "b/c", "b/d", "e", "f"]);

			expect(filterFileTree(tree, () => false)).to.deep.equal({
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
