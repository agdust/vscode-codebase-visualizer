import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
	build: {
		target: "node22",
		lib: {
			entry: path.resolve(__dirname, "src/extension.ts"),
			fileName: () => "extension.js",
			formats: ["cjs"],
		},
		outDir: "dist",
		rollupOptions: {
			external: [
				"vscode",
				"fs",
				"path",
				"child_process",
				"util",
				"events",
				"assert",
				"stream",
				"constants",
				"os",
				"crypto",
				"buffer",
				"url",
				"http",
				"https",
				"zlib",
				"net",
				"tls",
				"dgram",
				"dns",
				"readline",
				"tty",
				"v8",
				"vm",
				"module",
				"worker_threads",
			],
			output: {
				entryFileNames: "extension.js",
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
