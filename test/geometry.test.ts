import { expect } from "chai";
import { describe, test } from "mocha";

import "./helpers"; // add custom assertions
import * as geo from "../src/util/geometry";
import { Point, Box } from "../src/util/geometry";

describe("Test geometry.ts", () => {
	it("distance", () => {
		expect(geo.distance([1, 2], [3, 4])).to.be.closeTo(2.828, 0.0005);
		expect(geo.distance([3, 4], [1, 2])).to.be.closeTo(2.828, 0.0005);
		expect(geo.distance([0, 0], [1, 0])).to.eql(1);
		expect(geo.distance([0, 0], [0, 0])).to.eql(0);
	});
});
