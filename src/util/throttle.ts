/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 */
export function throttle(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	func: (...args: any[]) => void,
	wait: number,
	options: { leading?: boolean; trailing?: boolean } = {},
) {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	let previous = 0;
	const { leading = true, trailing = true } = options;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return function (this: any, ...args: any[]) {
		const now = Date.now();
		if (!previous && !leading) previous = now;
		const remaining = wait - (now - previous);
		if (remaining <= 0 || remaining > wait) {
			if (timeout) {
				clearTimeout(timeout);
				timeout = null;
			}
			previous = now;
			func.apply(this, args);
		} else if (!timeout && trailing) {
			timeout = setTimeout(() => {
				previous = leading === false ? 0 : Date.now();
				timeout = null;
				func.apply(this, args);
			}, remaining);
		}
	};
}
