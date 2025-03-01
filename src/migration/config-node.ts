/**
 * Copyright 2022-2024 Gauthier Dandele
 *
 * Licensed under the MIT License,
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://opensource.org/licenses/MIT.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { NodeAPI } from "node-red";

/**
 * The required version of the {@link https://github.com/GogoVega/Firebase-Config-Node | Config Node}.
 *
 * WARNING: Do not change the name because it's used by the publish script!
 *
 * @internal
 */
const requiredVersion = [0, 2, 4];

/**
 * Cache system to not read files multiple times.
 *
 * Indeed the {@link checkConfigNodeSatisfiesVersion} function is called in the Firebase Class which
 * is the base of each Firebase node.
 *
 * @internal
 */
const cacheResult = { cached: false, errorEmitted: false };

/**
 * Checks if the {@link https://github.com/GogoVega/Firebase-Config-Node | Config Node} version matches
 * the version required by this RTDB palette.
 *
 * When installing this palette, NPM may install the Config Node inside the Firestore/RTDB package which
 * results that Node-RED not loading the correct version.
 *
 * @param RED The NodeAPI
 * @param version The current version of the Config Node
 * @returns `true` if the version of the Config Node is satisfied
 */
function checkConfigNodeSatisfiesVersion(RED: NodeAPI, version: string): boolean {
	if (cacheResult.errorEmitted) return false;
	if (cacheResult.cached) return true;

	cacheResult.cached = true;

	const match = /([0-9])\.([0-9]+)\.([0-9]+)/.exec(version);
	if (match) {
		match.shift();

		const [major, minor, patch] = match.map((v) => parseInt(v, 10));

		if (
			major > requiredVersion[0] ||
			(major === requiredVersion[0] &&
				(minor > requiredVersion[1] || (minor === requiredVersion[1] && patch >= requiredVersion[2])))
		)
			return true;

		cacheResult.errorEmitted = true;

		RED.log.error("FIREBASE: The Config Node version does not meet the requirements of this palette.");
		RED.log.error("\tRequired Version:\t" + requiredVersion.join("."));
		RED.log.error("\tCurrent Version: \t" + version);
		RED.log.error("\tPlease run the following command to resolve the issue:");
		RED.log.error("\n\t\tcd ~/.node-red\n\t\tnpm update --omit=dev --save --engine-strict\n");

		return false;
	}

	// Not supposed to happen
	return true;
}

type Exec = Record<"run", (command: string, args: string[], option: object, emit: boolean) => Promise<object>>;

/**
 * Run a system command with stdout/err being emitted as notification to the Event Log panel.
 *
 * @param RED The NodeAPI
 * @param exec The `@node-red/util.exec` instance (because not imported to NodeAPI)
 * @returns A promise that resolves (rc=0) or rejects (rc!=0) when the command completes.
 */
function runUpdateDependencies(RED: NodeAPI, exec: Exec): Promise<object> {
	const isWindows = process.platform === "win32";
	const npmCommand = isWindows ? "npm.cmd" : "npm";
	const extraArgs = [
		"--no-audit",
		"--no-update-notifier",
		"--no-fund",
		"--save",
		"--save-prefix=~",
		"--omit=dev",
		"--engine-strict",
	];
	const args = ["update", ...extraArgs];
	const userDir = RED.settings.userDir || process.env.NODE_RED_HOME || ".";

	return exec.run(npmCommand, args, { cwd: userDir, shell: true }, true);
}

/**
 * Check if the Config Node version satisfies the required version by this palette.
 *
 * @returns `true` if the version is satisfied
 */
function versionIsSatisfied(): boolean {
	return !cacheResult.errorEmitted;
}

export { versionIsSatisfied, checkConfigNodeSatisfiesVersion, runUpdateDependencies };
