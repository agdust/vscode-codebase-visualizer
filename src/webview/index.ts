import CBRVWebview from "./CBRVWebview";
import { CBRVMessage, CBRVWebviewMessage, Directory, AnyFile, FileType } from "../types";
import "./CBRVStyles.css";

const vscode = acquireVsCodeApi();

function main() {
	let view: CBRVWebview | undefined;
	const svg = document.getElementById("diagram")!;

	// Sidebar elements
	const sidebar = document.getElementById("sidebar")!;
	const openSidebarBtn = document.getElementById("open-sidebar")!;
	const closeSidebarBtn = document.getElementById("close-sidebar")!;
	const includeInput = document.getElementById("include") as HTMLInputElement;
	const excludeInput = document.getElementById("exclude") as HTMLInputElement;
	const fileTreeContainer = document.getElementById("file-tree")!;
	const fileTreeHeader = document.getElementById("file-tree-header")!;
	const fileTreeToggleIcon = document.getElementById("file-tree-toggle-icon")!;

	// State for file tree checkboxes
	const excludedPaths = new Set<string>();

	addEventListener("message", (event) => {
		const message: CBRVMessage = event.data;
		if (message.type == "set") {
			if (message.settings) {
				includeInput.value = message.settings.filters.include;
				excludeInput.value = message.settings.filters.exclude;
			}

			if (message.codebase) {
				renderFileTree(message.codebase, fileTreeContainer);
			}

			if (!view) {
				view = new CBRVWebview(message.settings!, message.codebase!);
				return;
			}
			view.update(message.settings, message.codebase);
			return;
		}
	});

	// just pass events through as webview messages
	svg.addEventListener(`cbrv:send`, (event: any) => {
		vscode.postMessage(event.detail as CBRVWebviewMessage);
	});

	const toggleSidebar = () => {
		sidebar.classList.toggle("collapsed");
		// Trigger resize after transition so diagram updates
		setTimeout(() => {
			window.dispatchEvent(new Event("resize"));
		}, 250); // Match CSS transition time
	};

	openSidebarBtn.addEventListener("click", toggleSidebar);
	closeSidebarBtn.addEventListener("click", toggleSidebar);

	// File Tree Toggle
	fileTreeHeader.addEventListener("click", () => {
		if (fileTreeContainer.style.display === "none") {
			fileTreeContainer.style.display = "block";
			fileTreeToggleIcon.textContent = "▼";
		} else {
			fileTreeContainer.style.display = "none";
			fileTreeToggleIcon.textContent = "▶";
		}
	});

	const updateFilters = () => {
		if (view) {
			// Combine manual exclude input with checkbox exclusions
			const manualExclude = excludeInput.value.trim();
			const checkboxExclude = Array.from(excludedPaths).join(",");
			const combinedExclude = manualExclude
				? checkboxExclude
					? `${manualExclude},${checkboxExclude}`
					: manualExclude
				: checkboxExclude;

			view.emitUpdateSettings({
				filters: {
					include: includeInput.value.trim(),
					exclude: combinedExclude,
				},
			});
		}
	};

	includeInput.addEventListener("change", updateFilters);
	excludeInput.addEventListener("change", updateFilters);

	function renderFileTree(root: Directory, container: HTMLElement) {
		container.innerHTML = "";
		const tree = createTree(root, "");
		container.appendChild(tree);
	}

	function createTree(node: AnyFile, path: string): HTMLElement {
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
		checkbox.checked = !excludedPaths.has(currentPath);
		checkbox.onclick = (e) => {
			e.stopPropagation();
			const isChecked = checkbox.checked;
			if (isChecked) {
				excludedPaths.delete(currentPath);
			} else {
				excludedPaths.add(currentPath);
			}
			// If directory, toggle children
			if (isDir) {
				const childrenCheckboxes = nodeEl.querySelectorAll('input[type="checkbox"]');
				childrenCheckboxes.forEach((cb: any) => {
					cb.checked = isChecked;
					// We need to update excludedPaths for children too, but logic is complex with globs.
					// For now, let's just rely on the parent exclusion or individual file exclusion.
					// Actually, if we exclude a folder, we should probably add the folder path to exclude list.
					// If we include a folder, we remove it from exclude list.
					// But what if children were individually excluded?
					// Simple approach: Checkbox reflects inclusion.
					// If unchecked, add to exclude list.
					// If checked, remove from exclude list.
				});
			}
			updateFilters();
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
				childrenContainer.appendChild(createTree(child, currentPath));
			});
			nodeEl.appendChild(childrenContainer);
		}

		return nodeEl;
	}

	vscode.postMessage({ type: "ready" });
}

addEventListener("DOMContentLoaded", main);
