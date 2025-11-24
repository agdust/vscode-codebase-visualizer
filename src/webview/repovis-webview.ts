import * as d3 from "d3";

import {
	AnyFile,
	FileType,
	Directory,
	WebviewVisualizationSettings,
	RepovisWebviewMessage,
} from "../types";
import { getExtension } from "../util/getExtension";
import { filterFileTree } from "../util/filterFileTree";
import { throttle } from "../util/throttle";
import { Point, Box } from "../util/geometry";
import { ellipsisText, getRect } from "./rendering";
import { presetColors, unknownColor } from "./colors";

type Node = d3.HierarchyCircularNode<AnyFile>;
// Shortcut for d3.Selection
type Selection<
	GElement extends d3.BaseType = HTMLElement,
	Datum = unknown,
> = d3.Selection<GElement, Datum, d3.BaseType, undefined>;

/**
 * This is the class that renders the actual diagram.
 */
export default class RepovisWebview {
	settings: WebviewVisualizationSettings;
	codebase: Directory;

	/**
	 * Settings and constants for the diagram
	 * These are in viewbox units unless specified otherwise
	 */
	s = {
		/** Size (width and height) of the diagram within the svg viewbox */
		diagramSize: 1000,
		/** Margins of the svg diagram. The viewbox will be diagramSize plus these. */
		margin: { top: 10, right: 5, bottom: 5, left: 5 },
		file: {
			/** Padding between file circles */
			padding: 20,
			/** Minimum area of file circles */
			minSize: 16,
			/** Maximum area of file circles */
			maxSize: 1024 ** 2,
		},
		label: {
			/** Padding between labels and the outline of each file circle */
			padding: 2,
			/** Pixel size of the label font at the highest level. Size will shrink as we go down levels. */
			fontMax: 12,
			/** Minimum pixel size label font will shrink to at deepest depth. */
			fontMin: 12,
		},
		zoom: {
			/** Radius when a directory's contents will be hidden (in px) */
			hideContentsR: 16,
			/** Radius when a directory's or file's labels will be hidden (in px) */
			hideLabelsR: 20,
			/** Amount pressing an arrow key will pan in viewbox units */
			panKeyAmount: 50,
			/** Amount pressing Ctrl-+/- will scale*/
			zoomKeyAmount: 1.5,
		},
	};

	// Parts of the d3 diagram
	diagram: Selection<SVGSVGElement>;
	svgElement: SVGSVGElement;
	defs: Selection<SVGDefsElement>;
	zoomWindow: Selection<SVGGElement>;
	fileLayer: Selection<SVGGElement>;
	allFilesSelection?: Selection<SVGGElement, Node>;

	// Some rendering variables

	/** Actual current pixel width and height of the svg diagram */
	width = 0;
	height = 0;
	transform: d3.ZoomTransform = new d3.ZoomTransform(1, 0, 0);
	/** Maps file paths to their rendered circle (or first visible circle if they are hidden) */
	pathMap: Map<string, Node> = new Map();

	hoverTimerId?: number;

	/** Pass the selector for the canvas svg */
	constructor(settings: WebviewVisualizationSettings, codebase: Directory) {
		this.codebase = codebase;
		this.settings = settings;

		// Create the SVG
		this.diagram = d3
			.select<SVGSVGElement, unknown>("#diagram")
			.attr("viewBox", this.getViewbox());
		const node = this.diagram.node();
		if (!node) {
			throw new Error("Diagram element not found");
		}
		this.svgElement = node;
		this.defs = this.diagram.append("defs");
		this.zoomWindow = this.diagram.append("g").classed("zoom-window", true);
		this.fileLayer = this.zoomWindow.append("g").classed("file-layer", true);

		// SVG taken from Font Awesome 6.2.1 (https://fontawesome.com) "fa-share" icon, with some positioning tweaks
		this.defs.html(`
				<svg id="symlink-icon" viewBox="0 -480 512 448">
						<path d="
								M 307 -34.8 c -11.5 -5.1 -19 -16.6 -19 -29.2 v -64 H 176 C 78.8 -128 0 -206.8 0 -304 C 0 -417.3 81.5
								-467.9 100.2 -478.1 c 2.5 -1.4 5.3 -1.9 8.1 -1.9 c 10.9 0 19.7 8.9 19.7 19.7 c 0 7.5 -4.3 14.4 -9.8
								19.5 C 108.8 -431.9 96 -414.4 96 -384 c 0 53 43 96 96 96 h 96 v -64 c 0 -12.6 7.4 -24.1 19 -29.2 s
								25 -3 34.4 5.4 l 160 144 c 6.7 6.1 10.6 14.7 10.6 23.8 s -3.8 17.7 -10.6 23.8 l -160 144 c -9.4 8.5
								-22.9 10.6 -34.4 5.4 z
						"/>
				</svg>
		`);

		// Add event listeners
		this.throttledUpdate = throttle(
			() => {
				return this.update();
			},
			150,
			{ trailing: true },
		);

		const [x, y, width, height] = this.getViewbox();
		const extent: [Point, Point] = [
			[x, y],
			[x + width, y + height],
		];
		const zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.on("zoom", (e) => {
				return this.onZoom(e);
			})
			.extent(extent)
			.scaleExtent([1, Infinity])
			.translateExtent(extent);

		this.diagram
			.call(zoom)
			.on("dblclick.zoom", null) // double-click zoom interferes with clicking on files and folders
			.attr("tabindex", 0) // make svg focusable so it can receive keydown events
			.on("keydown", (event) => {
				const key = event.key;
				if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
					const dx = key == "ArrowLeft" ? -1 : key == "ArrowRight" ? +1 : 0;
					const dy = key == "ArrowUp" ? -1 : key == "ArrowDown" ? +1 : 0;
					const amount = this.s.zoom.panKeyAmount / this.transform.k;
					zoom.translateBy(this.diagram, dx * amount, dy * amount);
				} else if (event.ctrlKey && ["-", "="].includes(key)) {
					const amount = this.s.zoom.zoomKeyAmount;
					zoom.scaleBy(this.diagram, key == "=" ? amount : 1 / amount);
					event.stopPropagation(); // prevent VSCode from zooming the interface
				}
			});

		d3.select(document.body).on("resize", () => {
			return this.onResize();
		});

		[this.width, this.height] = getRect(this.svgElement);

		this.svgElement.focus(); // focus svg so keyboard shortcuts for zoom and pan work immediately

		this.update(this.settings, this.codebase);
	}

	getViewbox(): Box {
		const { top, right, bottom, left } = this.s.margin;
		// use negatives to add margin since pack() starts at 0 0. Viewbox is [minX, minY, width, height]
		return [
			-left,
			-top,
			left + this.s.diagramSize + right,
			top + this.s.diagramSize + bottom,
		];
	}

	throttledUpdate: () => void;

	update(settings?: WebviewVisualizationSettings, codebase?: Directory): void {
		this.settings = settings ?? this.settings;
		this.codebase = codebase ?? this.codebase;

		this.updateCodebase(!!(settings || codebase));
	}

	updateCodebase(fullRerender = true): void {
		// rename to filesChanged
		const filteredCodebase = this.filteredCodebase();

		const root = d3.hierarchy<AnyFile>(filteredCodebase, (f) => {
			return f.type === FileType.Directory ? f.children : undefined;
		});

		root.sum((d) => {
			// Compute size of files and folders.
			if (d.type === FileType.File) {
				return Math.min(this.s.file.maxSize, Math.max(d.size, this.s.file.minSize));
			}
			if (d.type === FileType.Directory) {
				// only give empty folders a size. Empty folders are normally
				return d.children.length == 0 ? 1 : 0; // filtered, but root can be empty.
			}
			if (d.type === FileType.SymbolicLink) {
				return this.s.file.minSize; // render all symbolic links as the minimum size.
			}
			throw new Error(`Unknown type`); // shouldn't be possible, other types won't be sent.
		});

		// Sort by descending size for layout purposes
		root.sort((a, b) => {
			return d3.descending(a.value, b.value);
		});

		// Use d3 to calculate the circle packing layout
		const packLayout = d3
			.pack<AnyFile>() // pack is slow, maybe cache it? It only needs to change if files actually change. Also would let me move pathMap. Though profiling seems its only a problem first time so maybe not
			.size([this.s.diagramSize, this.s.diagramSize])
			.padding(this.s.file.padding)(root);

		// Calculate unique key for each data. Use `type:path/to/file` so that types is treated as creating a new node
		// rather than update the existing one, which simplifies the logic.
		const keyFunc = (d: Node) => {
			return `${d.data.type}:${this.filePath(d)}`;
		};

		const data = packLayout.descendants().filter((d) => {
			return !d.parent || !this.shouldHideContents(d.parent);
		});

		const all = this.fileLayer
			.selectAll<SVGGElement, Node>(".file, .directory")
			.data(data, keyFunc)
			.join(
				(enter) => {
					const all = enter
						.append("g")
						.attr("data-file", (d) => {
							return this.filePath(d);
						})
						.classed("file", (d) => {
							return this.resolvedType(d) == FileType.File;
						})
						.classed("directory", (d) => {
							return this.resolvedType(d) == FileType.Directory;
						})
						.classed("symlink", (d) => {
							return d.data.type == FileType.SymbolicLink;
						})
						.classed("new", true); // We'll use this to reselect newly added nodes later.

					// Draw the circles for each file and directory. Use path instead of circle so we can use textPath
					// on it for the folder name
					all
						.append("path")
						.classed("circle", true)
						.attr("id", (d) => {
							return `file-${this.filePath(d)}`;
						});

					const files = all.filter((d) => {
						return this.resolvedType(d) == FileType.File;
					});
					const directories = all.filter((d) => {
						return this.resolvedType(d) == FileType.Directory;
					});
					const symlinks = all.filter((d) => {
						return d.data.type == FileType.SymbolicLink;
					}); // overlaps files/directories

					// Add labels
					files
						.filter((d) => {
							return d.data.type != FileType.SymbolicLink;
						})
						.append("text")
						.append("tspan")
						.classed("label", true)
						.attr("x", 0)
						.attr("y", 0)
						.attr("font-size", (d) => {
							return Math.max(this.s.label.fontMax - d.depth, this.s.label.fontMin);
						});

					// Add a folder name at the top. Add a "background" path behind the text to contrast with the circle
					// outline. We'll set the path in update after we've created the label so we can get the computed
					// text length and so it updates on changes to d.r. If we weren't using textPath, we could use
					// paint-order to stroke an outline, but textPath causes the stroke to cover other characters
					directories.append("path").classed("label-background", true);

					directories
						.append("text")
						.append("textPath")
						.classed("label", true)
						.attr("href", (d) => {
							return `#file-${encodeURIComponent(this.filePath(d))}`;
						})
						.attr("startOffset", "50%")
						.attr("font-size", (d) => {
							return Math.max(this.s.label.fontMax - d.depth, this.s.label.fontMin);
						});

					directories
						.append("text")
						.append("tspan")
						.classed("contents-hidden-label", true)
						.attr("x", 0)
						.attr("y", 0)
						.attr("font-size", (d) => {
							return this.calcPixelLength(d.r);
						}) // wait... scaling is after this...
						.text("...");

					const iconSize = this.s.file.minSize * 1.5;
					symlinks
						.append("use")
						.classed("symlink-icon", true)
						.attr("href", "#symlink-icon")
						.attr("x", -iconSize / 2) // offset to be centered
						.attr("y", -iconSize / 2)
						.attr("width", iconSize) // minSize is radius
						.attr("height", iconSize)
						.style("fill", (d) => {
							const isDir = this.resolvedType(d) == FileType.Directory;
							return `var(--vscode-editor-${isDir ? "foreground" : "background"})`;
						});

					// Add event listeners.
					all.on("dblclick", (_, d) => {
						if (d.data.type == FileType.Directory) {
							this.emit({ type: "reveal", file: this.filePath(d) });
						} else if (d.data.type == FileType.File) {
							this.emit({ type: "open", file: this.filePath(d) });
						} else if (d.data.type == FileType.SymbolicLink) {
							const jumpTo = this.pathMap.get(d.data.resolved);
							if (jumpTo) {
								this.emphasizeFile(jumpTo);
							}
						}
					});

					return all;
				},
				(update) =>
					// TODO transitions
					{
						return update.classed("new", false);
					},
				(exit) => {
					return exit.remove();
				},
			);

		all
			.classed("contents-hidden", (d) => {
				return this.shouldHideContents(d);
			})
			.classed("labels-hidden", (d) => {
				return this.shouldHideLabels(d);
			});

		// we only need to recalculate these for new elements unless the file structure changed (not just zoom)
		const changed = fullRerender ? all : all.filter(".new");

		changed.attr("transform", (d) => {
			return `translate(${d.x},${d.y})`;
		});

		changed
			.select("path.circle")
			// use path instead of circle so we can textPath it. Start at PI/2 so that the path starts at the bottom of
			// the circle and we don't cut off the directory label with the textPath
			.attr("d", (d) => {
				// use path instead of circle so we can textPath it. Start at PI/2 so that the path starts at the bottom
				// of the circle and we don't cut off the directory label with the textPath
				const path = d3.path();
				path.arc(0, 0, d.r, Math.PI / 2, (5 * Math.PI) / 2);
				return path.toString();
			});

		const files = changed.filter(".file");
		const directories = changed.filter(".directory");

		files.attr("fill", (d) => {
			return this.getItemColor(d.data);
		});

		files
			.select<SVGTSpanElement>(".label")
			.text((d) => {
				return d.data.name;
			})
			.each((d, i, nodes) => {
				const node = nodes[i];
				if (node) {
					ellipsisText(node, d.r * 2, d.r * 2, this.s.label.padding);
				}
			});

		const directoryLabels = directories
			.select<SVGTextPathElement>(".label")
			.text((d) => {
				return d.data.name;
			})
			.each((d, i, nodes) => {
				const node = nodes[i];
				if (node) {
					ellipsisText(node, Math.PI * d.r /* 1/2 circumference */);
				}
			});

		// Set the label background to the length of the labels
		directories.select<SVGTextElement>(".label-background").each((d, i, nodes) => {
			const labelNode = directoryLabels.nodes()[i];
			const node = nodes[i];
			if (labelNode && node) {
				const length = labelNode.getComputedTextLength() + 4;
				const angle = length / d.r;
				const top = (3 * Math.PI) / 2;
				const path = d3.path();
				path.arc(0, 0, d.r, top - angle / 2, top + angle / 2);
				node.setAttribute("d", path.toString());
			}
		});

		this.allFilesSelection = all;

		// Store a map of paths to nodes for future use
		const newPathMap = new Map<string, Node>();
		packLayout.each((d) => {
			// get d or the first ancestor that is visible
			const firstVisible = d.ancestors().find((p) => {
				return !p.parent || !this.shouldHideContents(p.parent);
			});
			if (firstVisible) {
				newPathMap.set(this.filePath(d), firstVisible);
			}
		});
		this.pathMap = newPathMap;
	}

	filteredCodebase(): Directory {
		return filterFileTree(
			this.codebase,
			(f) => {
				return !(f.type == FileType.Directory && f.children.length == 0);
			}, // filter empty dirs
		);
	}

	getItemColor(item: AnyFile): string {
		if (item.type === FileType.Directory) {
			return "transparent";
		}

		const ext = getExtension(
			item.type === FileType.SymbolicLink ? item.resolved : item.name,
		);
		if (presetColors[ext]) {
			return presetColors[ext];
		}
		return unknownColor;
	}

	filePath(node: Node): string {
		const ancestors = node
			.ancestors()
			.reverse()
			.slice(1)
			.map((d) => {
				return d.data.name;
			});
		// Root dir will be "/". Since these aren't absolute paths and all other paths don't start with /, "" would be
		// more natural, but "" is already used for "out-of-screen" targets. root won't show up in any connections
		// or tooltips anyway, so this is only internal.
		return ancestors.length === 0 ? "/" : ancestors.join("/");
	}

	/** Returns the type of the file if its a regular file, or its linked file type if its a symlink. */
	resolvedType(d: Node): typeof FileType.File | typeof FileType.Directory {
		return d.data.type === FileType.SymbolicLink ? d.data.linkedType : d.data.type;
	}

	/** Convert svg viewport units to actual rendered pixel length  */
	calcPixelLength(viewPortLength: number): number {
		const viewToRenderedRatio =
			Math.min(this.width, this.height) / (this.s.diagramSize / this.transform.k);
		return viewPortLength * viewToRenderedRatio;
	}

	shouldHideContents(d: d3.HierarchyCircularNode<AnyFile>): boolean {
		return (
			d.data.type === FileType.Directory &&
			this.calcPixelLength(d.r) <= this.s.zoom.hideContentsR
		);
	}

	shouldHideLabels(d: d3.HierarchyCircularNode<AnyFile>): boolean {
		return this.calcPixelLength(d.r) <= this.s.zoom.hideLabelsR;
	}

	onZoom(e: d3.D3ZoomEvent<SVGSVGElement, unknown>): void {
		const oldK = this.transform.k;
		this.transform = e.transform;
		this.zoomWindow.attr("transform", this.transform.toString());
		if (e.transform.k !== oldK) {
			// zoom also triggers for pan.
			this.throttledUpdate();
		}
	}

	onResize(): void {
		[this.width, this.height] = getRect(this.svgElement);
		this.throttledUpdate();
	}

	emit(message: RepovisWebviewMessage): void {
		this.svgElement.dispatchEvent(new CustomEvent(`repovis:send`, { detail: message }));
	}

	emitUpdateSettings(
		settingsUpdate: Partial<WebviewVisualizationSettings>,
		rerender = true,
	): void {
		const newSettings = Object.assign({}, this.settings, settingsUpdate);
		if (rerender) {
			this.update(newSettings);
		} else {
			this.settings = newSettings;
		}
		this.emit({ type: "update-settings", settings: settingsUpdate });
	}

	/** Jump the view to a file, and make it flash */
	emphasizeFile(node: Node): void {
		// Zoom to center and fit
		const zoom = d3.zoom<SVGSVGElement, unknown>();
		zoom.translateTo(this.diagram, node.x, node.y);
		if (2 * node.r * this.transform.k > this.s.diagramSize) {
			zoom.scaleTo(this.diagram, this.s.diagramSize / (2 * node.r));
		}
	}
}
