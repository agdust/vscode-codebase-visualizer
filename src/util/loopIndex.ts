/**
 * Converts i into a number in the range [0, len) such that len + 1 = 0 and -1 = len
 * Can be used to convert a number into a valid index in an array with circular semantics
 */
export function loopIndex(i: number, len: number): number {
	return i >= 0 ? i % len : len + ((i + 1) % len) - 1;
}
