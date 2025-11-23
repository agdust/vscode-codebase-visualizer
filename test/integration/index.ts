import * as path from "path";
import Mocha from "mocha";
import { glob } from "fs/promises";

export async function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({ ui: "tdd", color: true, timeout: 5 * 60 * 1000 });

	const testsRoot = path.resolve(__dirname, ".");

	for await (const f of glob("**/**.test.js", { cwd: testsRoot })) {
		mocha.addFile(path.resolve(testsRoot, f));
	}

	return new Promise((resolve, reject) => {
		try {
			// Run the mocha test
			mocha.run((failures) => {
				if (failures > 0) {
					reject(new Error(`${failures} tests failed.`));
				} else {
					resolve();
				}
			});
		} catch (err) {
			console.error(err);
			reject(err);
		}
	});
}
