export function wrapText(
	textElement: SVGTextElement,
	text: string,
	width: number,
	lineHeight: number,
	minFontSize?: number,
): void {
	// First try without breaking
	textElement.textContent = text;
	if (textElement.getComputedTextLength() <= width) {
		// It fits! Center it vertically
		const startDy = 0.35; // Center single line
		textElement.setAttribute("dy", `${startDy.toString()}em`);
		return;
	}

	// If it doesn't fit, try scaling down if minFontSize is provided
	if (minFontSize !== undefined) {
		const currentFontSizeAttr = textElement.getAttribute("font-size");
		const currentFontSize = currentFontSizeAttr
			? parseFloat(currentFontSizeAttr)
			: parseFloat(getComputedStyle(textElement).fontSize);
		const length = textElement.getComputedTextLength();
		const scale = width / length;
		const newFontSize = currentFontSize * scale;

		if (newFontSize >= minFontSize) {
			// Scale it!
			textElement.setAttribute("font-size", String(newFontSize));
			textElement.setAttribute("data-fit-font-size", String(newFontSize));
			const startDy = 0.35;
			textElement.setAttribute("dy", `${startDy.toString()}em`);
			return;
		}

		// Can't scale enough. Set to minFontSize and wrap.
		textElement.setAttribute("font-size", String(minFontSize));
		textElement.setAttribute("data-fit-font-size", String(minFontSize));
	}

	// Fallback: Use the result of maxLines (already in DOM)
	const tspans = Array.from(textElement.children) as SVGTSpanElement[];
	const totalHeightEm = tspans.length * lineHeight;
	const startDy = -totalHeightEm / 2 + 0.35;
	tspans.forEach((t, i) => {
		t.setAttribute("dy", `${(startDy + i * lineHeight).toString()}em`);
	});
}
