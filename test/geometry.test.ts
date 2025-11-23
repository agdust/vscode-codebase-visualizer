import { describe, it, expect } from "vitest";

import "./expect-extenders";
import { geometry } from "../src/util/geometry";

describe("Test geometry.ts", () => {
	it("distance", () => {
		expect(geometry.distance([1, 2], [3, 4])).toBeCloseTo(2.828, 3);
		expect(geometry.distance([3, 4], [1, 2])).toBeCloseTo(2.828, 3);
		expect(geometry.distance([0, 0], [1, 0])).toEqual(1);
		expect(geometry.distance([0, 0], [0, 0])).toEqual(0);
	});
});
