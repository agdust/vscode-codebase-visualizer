import CBRVWebview from "./CBRVWebview";
import { CBRVMessage, CBRVWebviewMessage, Directory, AnyFile, FileType } from "../types";
import "./CBRVStyles.css";
import { FileTree } from "./FileTree";

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

	const fileTree = new FileTree(excludedPaths, updateFilters);

	addEventListener("message", (event) => {
		const message: CBRVMessage = event.data;
		if (message.type == "set") {
			if (message.settings) {
				includeInput.value = message.settings.filters.include;
				excludeInput.value = message.settings.filters.exclude;
			}

			if (message.codebase) {
				fileTree.render(message.codebase, fileTreeContainer);
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

	includeInput.addEventListener("change", updateFilters);
	excludeInput.addEventListener("change", updateFilters);

	vscode.postMessage({ type: "ready" });
}

addEventListener("DOMContentLoaded", main);
