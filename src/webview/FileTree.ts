import { Directory, AnyFile, FileType } from "../types";

export class FileTree {
	private excludedPaths: Set<string>;
	private onUpdate: () => void;

	constructor(excludedPaths: Set<string>, onUpdate: () => void) {
		this.excludedPaths = excludedPaths;
		this.onUpdate = onUpdate;
	}

	public render(root: Directory, container: HTMLElement) {
		container.innerHTML = "";
		const tree = this.createTree(root, "");
		container.appendChild(tree);
	}

	private createTree(node: AnyFile, path: string): HTMLElement {
		const currentPath = path ? `${path}/${node.name}` : node.name;
		const isDir = node.type === FileType.Directory;

		const nodeEl = document.createElement("div");
		nodeEl.className = "tree-node";
		if (isDir) {
			nodeEl.classList.add("expanded");
		}

		const itemEl = document.createElement("div");
		itemEl.className = "tree-item";

		// Toggle for directories
		const toggleEl = document.createElement("span");
		toggleEl.className = "tree-toggle";
		toggleEl.textContent = isDir ? "▼" : "";
		if (isDir) {
			toggleEl.onclick = (e) => {
				e.stopPropagation();
				nodeEl.classList.toggle("expanded");
				toggleEl.textContent = nodeEl.classList.contains("expanded") ? "▼" : "▶";
			};
		}
		itemEl.appendChild(toggleEl);

		// Checkbox
		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.checked = !this.excludedPaths.has(currentPath);
		checkbox.onclick = (e) => {
			e.stopPropagation();
			const isChecked = checkbox.checked;
			if (isChecked) {
				this.excludedPaths.delete(currentPath);
			} else {
				this.excludedPaths.add(currentPath);
			}
			// If directory, toggle children
			if (isDir) {
				const childrenCheckboxes = nodeEl.querySelectorAll('input[type="checkbox"]');
				childrenCheckboxes.forEach((cb: any) => {
					cb.checked = isChecked;
				});
			}
			this.onUpdate();
		};
		itemEl.appendChild(checkbox);

		// Icon (simple text for now)
		const iconEl = document.createElement("span");
		iconEl.className = "icon";
		iconEl.textContent = isDir ? "📁" : "📄";
		itemEl.appendChild(iconEl);

		// Name
		const nameEl = document.createElement("span");
		nameEl.textContent = node.name;
		itemEl.appendChild(nameEl);

		nodeEl.appendChild(itemEl);

		if (isDir) {
			const childrenContainer = document.createElement("div");
			childrenContainer.className = "tree-children";
			(node as Directory).children.forEach((child) => {
				childrenContainer.appendChild(this.createTree(child, currentPath));
			});
			nodeEl.appendChild(childrenContainer);
		}

		return nodeEl;
	}
}
