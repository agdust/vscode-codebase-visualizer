import { expect } from "chai";
import { describe, it } from "mocha";

import "./expect-extenders";
import { geometry } from "../src/util/geometry";

describe("Test geometry.ts", () => {
	it("distance", () => {
		expect(geometry.distance([1, 2], [3, 4])).to.be.closeTo(2.828, 0.001);
		expect(geometry.distance([3, 4], [1, 2])).to.be.closeTo(2.828, 0.001);
		expect(geometry.distance([0, 0], [1, 0])).to.equal(1);
		expect(geometry.distance([0, 0], [0, 0])).to.equal(0);
	});
});
