/**
 * Copyright 2022-2023 Gauthier Dandele
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

import { exec } from "child_process";
import { NodeAPI } from "node-red";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * This function is used to check the existence of the config-node
 * because Node-RED does not yet allow to define nodes contained in dependencies.
 *
 * See https://github.com/node-red/node-red/issues/569
 *
 * The hack consists of giving to the module loader a link relative to the config-node.
 * If the config node is not found the user must manually install it or resolve path issues.
 *
 * Default path is: `~/.node-red/node_modules/@gogovega/firebase-config-node/build/nodes/firebase-config.js`
 *
 * @param RED NodeAPI
 */
function researchConfigNodeExistence(RED: NodeAPI) {
	const defaultUserDir = "~/.node-red";
	const scope = "@gogovega";
	const moduleName = "firebase-config-node";
	const path2ConfigNode = "build/nodes/firebase-config.js";

	try {
		const userDir = (RED.settings.available() && RED.settings.userDir) || defaultUserDir;
		let configNodeInstalledManually: boolean = false;

		const relativePath = {
			path: join(__dirname, "../../../", moduleName, path2ConfigNode),
			valide: false,
		};

		const pathFromUserDir = {
			path: join(userDir, "node_modules/", scope, moduleName, path2ConfigNode),
			valide: false,
		};

		const packageFilePath = join(userDir, "package.json");
		const packageFileExist = existsSync(packageFilePath);

		if (packageFileExist) {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const content = require(packageFilePath);
			configNodeInstalledManually =
				typeof content === "object" &&
				"dependencies" in content &&
				typeof content.dependencies === "object" &&
				moduleName in content.dependencies;
		}

		// Check the path existence
		for (const option of [relativePath, pathFromUserDir]) {
			option.valide = existsSync(option.path);
		}

		const configNodeFound = pathFromUserDir.valide === true;
		const userDirNotDefault = relativePath.path !== pathFromUserDir.path;

		if (!configNodeFound && !configNodeInstalledManually) {
			const msg = [
				"\nFirebase ERR!  Unable to find the config-node!",
				`The config-node is not located in\n  ${pathFromUserDir.path}`,
			];

			if (userDirNotDefault)
				msg.push(`\nThe config-node ${relativePath.valide ? "is" : "is not"} located in\n  ${relativePath.path}\n`);

			const installFromNPM = `npm install ${scope}/${moduleName}@latest --omit=dev --save`;
			const installFromFile = `npm install file:${relativePath.path.split(`/${path2ConfigNode}`)[0]} --save`;
			const installLink = relativePath.valide ? installFromFile : installFromNPM;
			msg.push(`  To resolve this problem, please run:\n    cd ${userDir}`, `    ${installLink}`);

			if (!relativePath.valide)
				msg.push(
					"\n  Or complete the path and run the following command:\n",
					`npm install file:/path/to/${moduleName} --save`
				);

			msg.push(
				"\nRead more about this problem at https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/discussions/50\n"
			);

			console.error(msg.join("\n"));

			return {
				found: false,
				dir: userDir,
				install: installLink,
				valide: relativePath.valide,
			};
		}

		return { found: true };
	} catch (error) {
		console.error("\nFirebase ERR! An error occurred while searching for the config-node.\n");
	}
}

/**
 * Checks if the old config-node is still in use
 * @param RED NodeAPI
 * @returns True if still used, false if not and undefined if the check failed
 */
function isOldConfigNodeStillInUse(RED: NodeAPI) {
	const userDir = (RED.settings.available() ? RED.settings.userDir : "") || "~/.node-red";
	const flowFileName = (RED.settings.available() ? RED.settings.flowFile : "") || "flows.json";
	const flowFilePath = join(userDir, flowFileName);

	if (!existsSync(flowFilePath)) return;

	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const flowFile = require(flowFilePath);

	if (!Array.isArray(flowFile)) return;

	const [oldConfigUsed] = flowFile.filter(
		(flow) => typeof flow === "object" && flow?.type === "database-config" && "authType" in flow
	);

	return !!oldConfigUsed;
}

function runInstallScript(userDir: string, install: string): Promise<void> {
	return new Promise((resolve, reject) => {
		exec(`cd "${userDir}" && ${install}`, function (error, stdout, stderr) {
			if (stdout) console.log("Launching the Installation script:\n", stdout);
			if (stderr) console.error("An error occurred during the Installation script:\n", stderr);
			if (error) return reject(error);
			resolve();
		});
	});
}

export { isOldConfigNodeStillInUse, researchConfigNodeExistence, runInstallScript };
