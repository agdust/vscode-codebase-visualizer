import { Directory, AnyFile, FileType } from "../types";
import { getExtension } from "../util/getExtension";

interface ExtensionStat {
	extension: string;
	count: number;
}

export class ExtensionFilter {
	private excludedExtensions: Set<string>;
	private onUpdate: () => void;

	constructor(excludedExtensions: Set<string>, onUpdate: () => void) {
		this.excludedExtensions = excludedExtensions;
		this.onUpdate = onUpdate;
	}

	public render(root: Directory, container: HTMLElement): void {
		container.innerHTML = "";
		const stats = this.collectStats(root);

		// Sort by count descending
		stats.sort((a, b) => {
			return b.count - a.count;
		});

		const list = document.createElement("div");
		list.className = "extension-list";

		stats.forEach((stat) => {
			const item = document.createElement("label");
			item.className = "extension-item";

			const checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.checked = !this.excludedExtensions.has(stat.extension);
			checkbox.onclick = (e: MouseEvent) => {
				e.stopPropagation();
				if (checkbox.checked) {
					this.excludedExtensions.delete(stat.extension);
				} else {
					this.excludedExtensions.add(stat.extension);
				}
				this.onUpdate();
			};

			const label = document.createElement("span");
			label.className = "extension-label";
			label.textContent = stat.extension || "(no extension)";

			const count = document.createElement("span");
			count.className = "extension-count";
			count.textContent = stat.count.toString();

			item.appendChild(checkbox);
			item.appendChild(label);
			item.appendChild(count);
			list.appendChild(item);
		});

		container.appendChild(list);
	}

	private collectStats(root: Directory): ExtensionStat[] {
		const counts = new Map<string, number>();

		const traverse = (node: AnyFile) => {
			if (node.type === FileType.File) {
				const ext = getExtension(node.name);
				counts.set(ext, (counts.get(ext) || 0) + 1);
			} else if (node.type === FileType.Directory) {
				node.children.forEach(traverse);
			}
		};

		traverse(root);

		return Array.from(counts.entries()).map(([extension, count]) => {
			return {
				extension,
				count,
			};
		});
	}
}
