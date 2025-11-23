import _ from "lodash";

export type Point = [number, number];

/** [x, y, width, height] */
export type Box = [number, number, number, number];

/** Returns the distance between two points */
function distance(a: Point, b: Point): number {
	return Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1]));
}

export const geometry = {
	distance,
};
