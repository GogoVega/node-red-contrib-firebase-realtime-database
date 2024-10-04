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

import { existsSync } from "node:fs";
import { join } from "node:path";
import { NodeAPI } from "node-red";
import { ConfigNode } from "@gogovega/firebase-config-node/types";
import { runUpdateDependencies, versionIsSatisfied } from "../migration/config-node";

/**
 * This fake node is used as:
 * An endpoint for nodes to request services from
 *   - Returns options to autocomplete the path field
 *   - Informs the editor about the config-node status
 *   - Run a command to update NR dependencies
 *
 * Hosted services such as FlowFuse do not use a file system - so it's not possible to run the Migrate script
 * from the runtime.
 */
module.exports = function (RED: NodeAPI) {
	let updateScriptCalled: boolean = false;

	// Check if the Config Node version satisfies the require one
	RED.httpAdmin.get("/firebase/rtdb/config-node/status", RED.auth.needsPermission("load-config.write"), (_req, res) => {
		res.json({
			status: {
				versionIsSatisfied: versionIsSatisfied(),
				updateScriptCalled: updateScriptCalled,
			},
		});
	});

	// Run the Update Script
	RED.httpAdmin.post(
		"/firebase/rtdb/config-node/scripts",
		RED.auth.needsPermission("load-config.write"),
		async (req, res) => {
			try {
				const scriptName = req.body.script;

				if (scriptName === "update-dependencies") {
					// To avoid a bad use - running the script multiple times
					if (updateScriptCalled) throw new Error("Update Script already called");

					updateScriptCalled = true;

					if (!RED.settings.userDir) throw new Error("Node-RED 'userDir' Setting not available");

					// @node-red/util.exec is not imported to NodeAPI, so it's a workaround to get it
					// TODO: if there is a risk that the "require" fails, make a locally revisited copy
					let utilPath = join(process.env.NODE_RED_HOME || ".", "node_modules", "@node-red/util");

					if (!existsSync(utilPath)) {
						// Some installations like FlowFuse use this path
						utilPath = join(process.env.NODE_RED_HOME || ".", "../", "@node-red/util");
					}

					// eslint-disable-next-line @typescript-eslint/no-require-imports
					const exec = require(utilPath).exec;

					RED.log.info("Starting to update Node-RED dependencies...");

					await runUpdateDependencies(RED, exec);

					RED.log.info("Successfully updated Node-RED dependencies. Please restarts Node-RED.");
				} else {
					// Forbidden
					res.sendStatus(403);
					return;
				}

				res.json({ status: "success" });
			} catch (error) {
				const msg = error instanceof Error ? error.toString() : (error as Record<"stderr", string>).stderr;

				RED.log.error("An error occured while updating Node-RED dependencies: " + msg);

				res.json({
					status: "error",
					msg: msg,
				});
			}
		}
	);

	// Get autocomplete options
	RED.httpAdmin.get(
		"/firebase/rtdb/autocomplete/:id?",
		RED.auth.needsPermission("load-config.write"),
		async (req, res) => {
			const id = req.params.id as string | undefined;
			const path = req.query.path as string | undefined;

			if (!id) {
				res.status(400).send("The config-node ID is missing!");
				return;
			}

			const node = RED.nodes.getNode(id) as ConfigNode | null;

			// Like database field not setted or new config-node not yet deployed
			if (!node) {
				res.json([]);
				return;
			}

			try {
				// May fail if permission is denied
				const snapshot = await node.rtdb?.get(decodeURI(path || ""));
				const data = snapshot ? snapshot.val() : {};
				const options = typeof data === "object" ? Object.keys(data ?? {}) : [];

				res.json(options);
			} catch (error) {
				res.status(500).send({ message: String(error) });
			}
		}
	);
};
