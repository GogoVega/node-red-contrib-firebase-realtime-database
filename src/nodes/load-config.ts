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

import { NodeAPI } from "node-red";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * This fake node is used to check the existence of the config-node
 * because Node-RED does not yet allow to define nodes contained in dependencies.
 *
 * See https://github.com/node-red/node-red/issues/569
 *
 * The hack consists of giving to the module loader a link relative to the config-node.
 * If the config node is not found the user must manually install it or resolve path issues.
 *
 * Default path is: `~/.node-red/node_modules/@gogovega/firebase-config-node/build/nodes/firebase-config.js`
 */
module.exports = function (RED: NodeAPI) {
	const defaultUserDir = "~/.node-red";
	const moduleName = "@gogovega/firebase-config-node";
	const path2ConfigNode = "build/nodes/firebase-config.js";

	try {
		let configNodeInstalledManually: boolean = false;
		const possiblePath: Array<{ path: string; valide: boolean }> = [];
		let userDir: string | undefined;

		possiblePath.push({ path: join(__dirname, "../../../../", moduleName, path2ConfigNode), valide: false });

		if (RED.settings.available() && RED.settings.userDir) {
			userDir = RED.settings.userDir;
			possiblePath.push({
				path: join(RED.settings.userDir, "/node_modules/", moduleName, path2ConfigNode),
				valide: false,
			});

			const packageFilePath = join(RED.settings.userDir, "package.json");

			if (packageFilePath) {
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const content = require(packageFilePath);
				configNodeInstalledManually =
					typeof content === "object" && content && content.dependencies[moduleName] ? true : false;
			}
		}

		// Check the path existence
		for (const option of possiblePath) {
			option.valide = existsSync(option.path);
		}

		const configNodeFound = possiblePath[0].valide === true;

		if (!configNodeFound && !configNodeInstalledManually) {
			const [relativePath, pathFromUserDir] = possiblePath;
			const { path, valide } = pathFromUserDir || {};
			const secondMessage = `\nThe config-node ${valide ? "is" : "is not"} located in\n  ${path}\n`;
			const userDirNotDefault = relativePath.path !== path && path;
			const installFromNPM = `${moduleName}@latest --omit=dev`;
			const installFromFile = `file:${path?.split(path2ConfigNode)[0]}`;
			const installLink = valide ? installFromFile : installFromNPM;

			console.error(`
Firebase ERR!  Unable to find the config-node!
The config-node is not located in
  ${relativePath.path}
${userDirNotDefault ? secondMessage : ""}
  To resolve this problem, please run:
    cd ${userDir || defaultUserDir}
    npm i ${installLink} --save
${userDirNotDefault ? "\n  Or resolve the path in the 'package.json' file\n" : ""}
Read more about this problem at https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/discussions/50
`);
		}
	} catch (error) {
		console.error("\nFirebase ERR! An error occurred while searching for the config-node.\n");
	}
};
