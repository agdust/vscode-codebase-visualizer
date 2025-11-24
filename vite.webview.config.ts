import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
	build: {
		target: "es2020", // Webviews run in a browser environment (Chromium)
		outDir: "dist/webview",
		rollupOptions: {
			input: {
				webview: path.resolve(__dirname, "src/webview/webview.ts"),
			},
			output: {
				entryFileNames: "[name].js",
				assetFileNames: "[name].[ext]", // Keep original names for assets like CSS
			},
		},
		sourcemap: true,
		minify: false,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
});
