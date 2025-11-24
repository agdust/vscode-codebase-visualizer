import RepovisWebview from "./repovis-webview";
import { RepovisMessage, RepovisWebviewMessage, Directory } from "../types";
import { FileTree } from "./FileTree";
import { ExtensionFilter } from "./ExtensionFilter";
import { filterFileTree } from "../util/filterFileTree";
import { createFilterPredicate } from "./filterLogic";

import "./webview.css";

const vscode = acquireVsCodeApi();

function main() {
	let view: RepovisWebview | undefined;
	const getElement = (id: string) => {
		const element = document.getElementById(id);
		if (!element) {
			throw new Error(`Element with id "${id}" not found`);
		}
		return element;
	};

	const svg = getElement("diagram");

	// Sidebar elements
	const sidebar = getElement("sidebar");
	const openSidebarBtn = getElement("open-sidebar");
	const closeSidebarBtn = getElement("close-sidebar");
	const includeInput = getElement("include") as HTMLInputElement;
	const excludeInput = getElement("exclude") as HTMLInputElement;
	const fileTreeContainer = getElement("file-tree") as HTMLDivElement;
	const extensionFilterContainer = getElement("extension-filter") as HTMLDivElement;

	// State for file tree checkboxes
	const excludedPaths = new Set<string>();
	const excludedExtensions = new Set<string>();
	let rawCodebase: Directory | undefined;

	const updateBackendFilters = () => {
		if (!view) {
			return;
		}
		view.emitUpdateSettings({
			include: includeInput.value.trim(),
			exclude: excludeInput.value.trim(),
		});
	};

	const updateClientFilters = () => {
		if (!view || !rawCodebase) {
			return;
		}

		view.update(
			undefined,
			filterFileTree(
				rawCodebase,
				createFilterPredicate(excludedPaths, excludedExtensions),
				rawCodebase.name,
			),
		);
	};

	const fileTree = new FileTree(excludedPaths, updateClientFilters);
	const extensionFilter = new ExtensionFilter(excludedExtensions, updateClientFilters);

	addEventListener("message", (event: MessageEvent<RepovisMessage>) => {
		const message = event.data;

		if (message.settings) {
			includeInput.value = message.settings.include;
			excludeInput.value = message.settings.exclude;
		}

		if (message.codebase) {
			rawCodebase = message.codebase;
			fileTree.render(message.codebase, fileTreeContainer);
			extensionFilter.render(message.codebase, extensionFilterContainer);
		}

		// Apply client-side filtering
		let filteredCodebase = rawCodebase;
		if (filteredCodebase) {
			filteredCodebase = filterFileTree(
				filteredCodebase,
				createFilterPredicate(excludedPaths, excludedExtensions),
				filteredCodebase.name,
			);
		}

		if (view) {
			view.update(message.settings, filteredCodebase);
			return;
		}

		if (message.settings && filteredCodebase) {
			view = new RepovisWebview(message.settings, filteredCodebase);
			return;
		}

		throw new Error(
			"Codebase Visualizer: View is not set, and either settings or codebase are not provided",
		);
	});

	// just pass events through as webview messages
	svg.addEventListener(`repovis:send`, (event: Event) => {
		vscode.postMessage((event as CustomEvent).detail as RepovisWebviewMessage);
	});

	const toggleSidebar = () => {
		sidebar.classList.toggle("collapsed");
	};

	openSidebarBtn.addEventListener("click", toggleSidebar);
	closeSidebarBtn.addEventListener("click", toggleSidebar);

	includeInput.addEventListener("change", updateBackendFilters);
	excludeInput.addEventListener("change", updateBackendFilters);

	vscode.postMessage({ type: "ready" });
}

addEventListener("DOMContentLoaded", main);
