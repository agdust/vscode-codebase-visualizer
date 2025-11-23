import CBRVWebview from "./CBRVWebview";
import { CBRVMessage, CBRVWebviewMessage } from "../types";
import "./CBRVStyles.css";

const vscode = acquireVsCodeApi();

function main() {
	let view: CBRVWebview | undefined;
	const svg = document.getElementById("diagram")!;

	addEventListener("message", (event) => {
		const message: CBRVMessage = event.data;
		if (message.type == "set") {
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

	vscode.postMessage({ type: "ready" });
}

addEventListener("DOMContentLoaded", main);
