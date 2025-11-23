export function isObject(obj: unknown): obj is Record<string, unknown> {
	if (typeof obj !== "object" || obj === null) return false;

	if (Array.isArray(obj)) return false;

	if (Object.getOwnPropertySymbols(obj).length > 0) return false;

	return true;
}
