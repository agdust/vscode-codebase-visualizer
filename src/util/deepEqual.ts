export function deepEqual(
	a: unknown,
	b: unknown,
	comparator?: (a: unknown, b: unknown, key?: string | number) => boolean | undefined,
): boolean {
	return deepEqualInternal(a, b, undefined, comparator);
}

function deepEqualInternal(
	a: unknown,
	b: unknown,
	key: string | number | undefined,
	comparator?: (a: unknown, b: unknown, key?: string | number) => boolean | undefined,
): boolean {
	if (comparator) {
		const result = comparator(a, b, key);
		if (result !== undefined) return result;
	}

	if (a === b) return true;

	if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
		return false;
	}

	if (Array.isArray(a)) {
		if (!Array.isArray(b)) return false;
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (!deepEqualInternal(a[i], b[i], i, comparator)) return false;
		}
		return true;
	}

	if (Array.isArray(b)) return false;

	const keysA = Object.keys(a);
	const keysB = Object.keys(b);

	if (keysA.length !== keysB.length) return false;

	for (const keyA of keysA) {
		if (!Object.prototype.hasOwnProperty.call(b, keyA)) return false;
		if (
			!deepEqualInternal(
				(a as Record<string, unknown>)[keyA],
				(b as Record<string, unknown>)[keyA],
				keyA,
				comparator,
			)
		)
			return false;
	}

	return true;
}
