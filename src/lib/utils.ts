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

function printEnumKeys(obj: object) {
	return Object.keys(obj)
		.filter((x) => !Number.isInteger(Number(x)))
		.map((x) => `'${x}'`)
		.join(", ");
}

/**
 * Checks path to match Firebase rules. Throws an error if does not match.
 * @param path The path to check
 * @param empty Can the path be empty? Default: `false`
 * @returns The path checked to the database
 */
function checkPath(path: unknown, empty?: boolean): string | undefined {
	if (empty && path === "") return;
	if (empty && path === undefined) return;
	if (!empty && path === undefined) throw new Error("The msg containing the PATH do not exist!");
	if (!empty && !path) throw new Error("PATH must be non-empty string!");
	if (typeof path !== "string") throw new Error("PATH must be a string!");
	if (path?.match(/[.#$\[\]]/g)) throw new Error(`PATH must not contain ".", "#", "$", "[", or "]"`);
	return path.trim() || undefined;
}

/**
 * Checks if the priority is valid otherwise throws an error.
 * @param priority The priority to be checked
 * @returns The priority checked
 */
function checkPriority(priority: unknown): number {
	if (priority === undefined) throw new Error("msg.priority do not exist!");
	if (typeof priority === "number") return priority;
	if (typeof priority === "string" && Number.isInteger(Number(priority))) return parseInt(priority, 10);
	throw new Error("msg.priority must be a number!");
}

export { checkPath, checkPriority, printEnumKeys };
