import CBRVWebview from "./CBRVWebview";
import { CBRVMessage, CBRVWebviewMessage } from "../types";
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

	addEventListener("message", (event) => {
		const message: CBRVMessage = event.data;
		if (message.type == "set") {
			if (message.settings) {
				includeInput.value = message.settings.filters.include;
				excludeInput.value = message.settings.filters.exclude;
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

	const updateFilters = () => {
		if (view) {
			view.emitUpdateSettings({
				filters: {
					include: includeInput.value.trim(),
					exclude: excludeInput.value.trim(),
				},
			});
		}
	};

	includeInput.addEventListener("change", updateFilters);
	excludeInput.addEventListener("change", updateFilters);

	vscode.postMessage({ type: "ready" });
}

addEventListener("DOMContentLoaded", main);
