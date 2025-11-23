import { defineConfig } from "vitest/config";

export default defineConfig({
	server: {
		watch: {
			ignored: ["**/node_modules/**", "**/dist/**", "**/test/sample-codebases/**"],
		},
	},
	test: {
		globals: true,
		environment: "node",
		include: ["test/**/*.test.ts"],
		exclude: ["test/integration/**/*.ts", "test/sample-codebases/**/*.ts"],
	},
});
