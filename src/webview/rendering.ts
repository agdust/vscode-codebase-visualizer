/**
 * If el's text is wider than width, cut it and add an ellipsis until if fits. Returns the new text in the node. If
 * the text won't fit at all, sets the text to empty. There are pure CSS ways of doing this, but they don't work in
 * SVGs unless we do a foreignObject.
 */
export function ellipsisText(
	el: SVGTextContentElement,
	width: number,
	height = Infinity,
	padding = 0,
): string {
	const [availableWidth, availableHeight] = [width - 2 * padding, height - 2 * padding];
	const fontHeight = parseInt(getComputedStyle(el).fontSize, 10);

	if (fontHeight > availableHeight) {
		el.textContent = "";
	} else if (el.getComputedTextLength() > availableWidth) {
		// need to crop it
		const originalText = el.textContent ?? "";

		// binary search to find the optimal length
		let fits = 0,
			doesntFit = originalText.length;
		while (fits + 1 < doesntFit) {
			// go until adding one more character doesn't fit
			const mid = Math.floor((fits + doesntFit) / 2);
			el.textContent = originalText.slice(0, mid) + "...";

			if (el.getComputedTextLength() > availableWidth) {
				doesntFit = mid;
			} else {
				// length <= width
				fits = mid;
			}
		}

		if (fits > 0) {
			el.textContent = originalText.slice(0, fits) + "...";
		} else {
			el.textContent = ""; // text can't fit at all
		}
	}

	return el.textContent ?? "";
}

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
		textElement.setAttribute("dy", `${startDy}em`);
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
			textElement.setAttribute("dy", `${startDy}em`);
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
		t.setAttribute("dy", `${startDy + i * lineHeight}em`);
	});
}

export function getRect(el: Element): [number, number] {
	const rect = el.getBoundingClientRect();
	return [rect.width, rect.height];
}
