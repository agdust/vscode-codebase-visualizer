export function shallowCompare(
	obj1: Record<string, unknown>,
	obj2: Record<string, unknown>,
): boolean {
	if (Object.keys(obj1).length !== Object.keys(obj2).length) return false;
	for (const key of Object.keys(obj1)) {
		if (obj1[key] !== obj2[key]) return false;
	}
	return true;
}
