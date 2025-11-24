import { isObject } from "./isObject";

/**
 * Converts a value to a normalized JSON string, sorting object keys.
 */
export function normalizedJsonStringify(val: unknown): string {
	return JSON.stringify(val, (_key: string, val: unknown) => {
		if (isObject(val)) {
			return Object.keys(val)
				.sort()
				.reduce<Record<string, unknown>>((acc, key) => {
					acc[key] = val[key];
					return acc;
				}, {});
		} else {
			return val;
		}
	});
}
