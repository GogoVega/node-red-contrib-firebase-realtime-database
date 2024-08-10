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

import { ConfigNode } from "@gogovega/firebase-config-node/types";
import { NodeAPI } from "node-red";
import { researchConfigNodeExistence, runInstallScript } from "../migration/config-node";

/**
 * This fake node is used:
 * 1. To check the existence of the config-node See {@link researchConfigNodeExistence}
 * 2. An endpoint for nodes to request services from
 *   - returns options to autocomplete the path field
 *   - Informs the user (notification) about the config-node status (has it been found)
 *
 * Hosted services such as FlowFuse do not use a file system - so it's not possible to run the Migrate script
 * from the runtime.
 */
module.exports = function (RED: NodeAPI) {
	const configNodeStatus = {
		configNode: researchConfigNodeExistence(RED),
		installCalled: false,
	};

	RED.httpAdmin.get("/firebase/rtdb/config-node/status", RED.auth.needsPermission("load-config.write"), (_req, res) => {
		const notifications = [];

		// Install Script
		if (!configNodeStatus.configNode?.found && !configNodeStatus.installCalled) {
			const msgInstallFromFile = `
					<html>
						<p>Welcome to Migration Wizard</p>
						<p>In order to use the new config-node introduced by v0.6, please run the installation script</p>
						<p>Read more about this migration <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/discussions/50">here</a>.</p>
					</html>`;
			const msgInstallFromNPM = `
					<html>
						<p>Welcome to Migration Wizard</p>
						<p>In order to use the new config-node introduced by v0.6, please run the installation script</p>
						<p>Or run the following command in your terminal:</p>
						<pre>cd ${configNodeStatus.configNode?.dir} && ${configNodeStatus.configNode?.install}</pre>
						<p>Read more about this migration <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/discussions/50">here</a>.</p>
					</html>`;
			const msgIfScriptNotRunnable = `
					<html>
						<p>Welcome to Migration Wizard</p>
						<p>The new config-node introduced by v0.6 did not load correctly.</p>
						<p>It looks like your user directory is not the default, please complete paths and run the following command:</p>
						<pre>cd ${configNodeStatus.configNode?.dir} && ${configNodeStatus.configNode?.install}</pre>
						<p>Or If you know the path to the module run the following command:</p>
						<pre>cd ${configNodeStatus.configNode?.dir} && npm install file:/path/to/firebase-config-node --save</pre>
						<p>Read more about this migration <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/discussions/50">here</a>.</p>
					</html>`;

			const scriptRunnable = configNodeStatus.configNode?.userDirValid;
			const msg = scriptRunnable
				? configNodeStatus.configNode?.valide
					? msgInstallFromFile
					: msgInstallFromNPM
				: msgIfScriptNotRunnable;
			const buttons = scriptRunnable ? ["Run Install", "Close"] : ["Close"];

			// Avoid spamming the user because this case should not happen
			if (!scriptRunnable) configNodeStatus.installCalled = true;

			notifications.push({
				msg: msg,
				type: "warning",
				fixed: true,
				modal: true,
				buttons: buttons,
			});
		}

		res.json({
			status: !notifications.length ? "ready" : "error",
			notifications: notifications,
		});
	});

	// Get autocomplete options
	RED.httpAdmin.get(
		"/firebase/rtdb/autocomplete/:id?",
		RED.auth.needsPermission("load-config.write"),
		async (req, res) => {
			const id = req.params.id as string | undefined;
			const path = req.query.path as string | undefined;

			if (!id) return res.status(400).send("The config-node ID is missing!");

			const node = RED.nodes.getNode(id) as ConfigNode | null;

			// Like database field not setted or new config-node not yet deployed
			if (!node) return res.json([]);

			const snapshot = await node.rtdb?.get(path);
			const data = snapshot ? snapshot.val() : {};
			const options = typeof data === "object" ? Object.keys(data ?? {}) : [];

			return res.json(options);
		}
	);

	// Run the Install Script
	RED.httpAdmin.post(
		"/firebase/rtdb/config-node/scripts",
		RED.auth.needsPermission("load-config.write"),
		async (req, res) => {
			try {
				const script = req.body.script;

				if (script === "install") {
					configNodeStatus.installCalled = true;

					if (!configNodeStatus.configNode?.dir || !configNodeStatus.configNode?.install)
						throw new Error("Node-RED Settings not available");

					await runInstallScript(configNodeStatus.configNode.dir, configNodeStatus.configNode.install);
				} else {
					res.sendStatus(403);
					return;
				}

				res.json({
					notifications: [
						{
							msg: "<html><p>Migration Successful!</p><p>Restarts now Node-RED and reload your browser</p></html>",
							type: "success",
							fixed: true,
							buttons: ["Close"],
						},
					],
				});
			} catch (error) {
				console.error("Error during Migration", error);
				res.json({
					notifications: [
						{
							msg: '<html><p>Migration Failed!</p><p>Please raise an issue <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/issues/new/choose">here</a> with log details</p></html>',
							type: "error",
							fixed: true,
							buttons: ["Close"],
						},
					],
				});
			}
		}
	);
};
