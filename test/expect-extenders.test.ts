import { describe, it, expect } from "vitest";
import "./expect-extenders";

describe("Test tests/helpers.ts", () => {
	it("deepCloseTo", () => {
		expect(1).deepCloseTo(1);
		expect(1.001).deepCloseTo(1, 0.005);

		const obj = { a: 1.0001, b: "a", c: [-1e-5, 1e-5] };
		const expected = { a: 1, b: "a", c: [0, 0] };

		expect(obj).not.deepCloseTo(expected);
		expect(obj).deepCloseTo(expected, 0.005);

		expect("a").deepCloseTo("a");
		expect([]).deepCloseTo([]);
	});
});
