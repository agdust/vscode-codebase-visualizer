import { expect } from "vitest";
import _ from "lodash";

interface CustomMatchers<R = unknown> {
	deepCloseTo(expected: unknown, epsilon?: number): R;
}

declare module "vitest" {
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
	interface Assertion<T = any> extends CustomMatchers<T> {}

	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	interface AsymmetricMatchersContaining extends CustomMatchers {}
}

expect.extend({
	deepCloseTo(received, expected, epsilon = 1e-8) {
		const pass = _.isEqualWith(received, expected, (a, b) =>
			[a, b].every((x) => typeof x == "number") ? Math.abs(a - b) < epsilon : undefined,
		);

		if (pass) {
			return {
				message: () =>
					`expected ${this.utils.printReceived(
						received,
					)} to not be approximately equal to ${this.utils.printExpected(expected)}`,
				pass: true,
			};
		} else {
			return {
				message: () =>
					`expected ${this.utils.printReceived(
						received,
					)} to be approximately equal to ${this.utils.printExpected(expected)}`,
				pass: false,
			};
		}
	},
});
