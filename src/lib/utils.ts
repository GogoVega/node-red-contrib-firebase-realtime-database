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

declare global {
	interface String {
		toPascalCase(): string;
	}
}

String.prototype.toPascalCase = function () {
	const words = this.match(/[a-z]+/gi);

	if (!words) return "";

	return words.map((word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()).join(" ");
};

function printEnumKeys(obj: object) {
	return Object.keys(obj)
		.filter((x) => !Number.isInteger(parseInt(x)))
		.map((x) => `'${x}'`)
		.join(", ");
}

/*
// A utiliser si le noeud de config n'est pas défini dans le package.json !
import path from "path";
function checkModuleAlreadyInstalled() {
	const mainPath = require.main?.path;

	console.log("FIREBASE: Checking if the module 'firebase-config-node' already exist...");

	if (!mainPath) {
		console.log("Failed to find the main path! Register anyway");
		return false;
	}

	const registry = require(path.join(mainPath, "node_modules/@node-red/registry/lib/index.js"));
	const modules: Record<string, object> = registry.getModuleList();

	if (modules["@gogovega/firebase-config-node"]) {
		console.log("The module already exist! Skipping register type");
		return true;
	}

	console.log("The module do not exist, registry type");
	return false;
}
*/

export { printEnumKeys };
