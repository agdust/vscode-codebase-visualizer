import RepovisWebview from "./repovis-webview";
import { RepovisMessage, RepovisWebviewMessage } from "../types";
import { FileTree } from "./FileTree";

import "./webview.css";

const vscode = acquireVsCodeApi();

function main() {
	let view: RepovisWebview | undefined;
	const getElement = <T extends HTMLElement = HTMLElement>(id: string): T => {
		const element = document.getElementById(id);
		if (!element) {
			throw new Error(`Element with id "${id}" not found`);
		}
		return element as T;
	};

	const svg = getElement("diagram");

	// Sidebar elements
	const sidebar = getElement("sidebar");
	const openSidebarBtn = getElement("open-sidebar");
	const closeSidebarBtn = getElement("close-sidebar");
	const includeInput = getElement<HTMLInputElement>("include");
	const excludeInput = getElement<HTMLInputElement>("exclude");
	const fileTreeContainer = getElement<HTMLDivElement>("file-tree");

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
				include: includeInput.value.trim(),
				exclude: combinedExclude,
			});
		}
	};

	const fileTree = new FileTree(excludedPaths, updateFilters);

	addEventListener("message", (event: MessageEvent) => {
		const message: RepovisMessage = event.data;

		if (message.type === "set") {
			if (message.settings) {
				includeInput.value = message.settings.include;
				excludeInput.value = message.settings.exclude;
			}

			if (message.codebase) {
				fileTree.render(message.codebase, fileTreeContainer);
			}

			if (view) {
				view.update(message.settings, message.codebase);
				return;
			}

			if (message.settings && message.codebase) {
				view = new RepovisWebview(message.settings, message.codebase);
				return;
			}

			throw new Error(
				"Codebase Visualizer: View is not set, and either settings or codebase are not provided",
			);
		}
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

	includeInput.addEventListener("change", updateFilters);
	excludeInput.addEventListener("change", updateFilters);

	vscode.postMessage({ type: "ready" });
}

addEventListener("DOMContentLoaded", main);
