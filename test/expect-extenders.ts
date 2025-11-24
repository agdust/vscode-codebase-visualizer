import { use } from "chai";
import { deepEqual } from "../src/util/deepEqual";

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	export namespace Chai {
		interface Assertion {
			deepCloseTo(expected: unknown, epsilon?: number): void;
		}
	}
}

use((chai, _utils) => {
	chai.Assertion.addMethod("deepCloseTo", function (expected: unknown, epsilon = 1e-8) {
		const received: unknown = this._obj;
		const pass = deepEqual(received, expected, (a, b) => {
			return [a, b].every((x) => {
				return typeof x === "number";
			})
				? Math.abs((a as number) - (b as number)) < epsilon
				: undefined;
		});

		this.assert(
			pass,
			"expected #{this} to be approximately equal to #{exp}",
			"expected #{this} to not be approximately equal to #{exp}",
			expected,
			received,
		);
	});
});
