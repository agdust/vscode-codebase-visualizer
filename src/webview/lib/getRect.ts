export function getRect(el: Element): [number, number] {
	const rect = el.getBoundingClientRect();
	return [rect.width, rect.height];
}
