export const getWebviewHtml = (scriptUri: string, styleUri: string): string => {
	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>CodeBase Relationship Visualizer</title>
		<link rel="stylesheet" href="${styleUri}">
	</head>
	<body>
		<div id="app">
			<div id="sidebar">
				<div class="sidebar-header">
					<span class="sidebar-title">Settings</span>
					<button id="close-sidebar" class="icon-button" title="Close Sidebar">
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							xmlns="http://www.w3.org/2000/svg"
							fill="currentColor"
						>
							<path
								d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"
							/>
						</svg>
					</button>
				</div>
				<div id="filters">
					<div class="form-group">
						<label for="include">Files to include</label>
						<input id="include" title="e.g. **/*.ts, src/**/include" placeholder="**/*" />
					</div>
					<div class="form-group">
						<label for="exclude">Files to exclude</label>
						<input
							id="exclude"
							title="e.g. **/*.ts, src/**/include"
							placeholder="node_modules/**"
						/>
					</div>
				</div>

				<details id="file-tree-details" class="filter-group">
					<summary class="sidebar-header" id="file-tree-header" style="cursor: pointer">
						<span class="sidebar-title">File Tree</span>
						<span class="tree-toggle"></span>
					</summary>
					<div id="file-tree" class="file-tree"></div>
				</details>
				<details id="extension-filter-details" class="filter-group">
					<summary class="sidebar-header" id="extension-filter-header" style="cursor: pointer">
						<span class="sidebar-title">Extensions</span>
						<span class="tree-toggle"></span>
					</summary>
					<div id="extension-filter" class="file-tree"></div>
				</details>
			</div>
			<div id="content">
				<button id="open-sidebar" class="icon-button" title="Open Settings">
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						xmlns="http://www.w3.org/2000/svg"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"
						/>
					</svg>
				</button>
				<svg id="diagram"></svg>
			</div>
		</div>
		<script>
			var exports = {};
		</script>
		<script src="${scriptUri}"></script>
	</body>
</html>`;
};
