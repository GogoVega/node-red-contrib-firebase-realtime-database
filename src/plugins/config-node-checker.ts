/**
 * Copyright 2022-2025 Gauthier Dandele
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
import {
	isConfigNodeLoadable,
	loadInternalNRModule,
	runUpdateDependencies,
	tinySemver,
} from "@gogovega/firebase-config-node/utils";
import { Firebase } from "../lib/firebase-node";
import { Registry, Util } from "../lib/types/node-red";

/**
 * The required version of the {@link https://github.com/GogoVega/Firebase-Config-Node | Config Node}.
 *
 * WARNING: Do not change the name because it's used by the publish script!
 *
 * @internal
 */
const requiredVersion: [number, number, number] = [0, 3, 1];

module.exports = function (RED: NodeAPI) {
	const status = {
		loadable: false,
		loaded: false,
		version: "0.0.0",
		versionIsSatisfied: false,
		updateScriptCalled: false,
	};

	// The Config Node Checker
	const checker = function (event?: object) {
		// Skip unrelated event
		// TODO: verify if node/added should be ignored
		if (
			event &&
			"id" in event &&
			typeof event.id === "string" &&
			!["runtime-state", "node/added", "plugin/added"].includes(event.id)
		)
			return;

		try {
			const { getModuleInfo } = loadInternalNRModule<Registry>("@node-red/registry");
			const configNode = getModuleInfo("@gogovega/firebase-config-node");

			if (configNode) {
				status.loadable = true;
				status.loaded = true;
				status.version = configNode.version;

				RED.log.debug("[rtdb:plugin]: Config node v" + status.version + " registered");

				if (tinySemver(requiredVersion, status.version)) {
					status.versionIsSatisfied = true;
					Firebase.configNodeSatisfiesVersion = true;
				} else {
					Firebase.configNodeSatisfiesVersion = false;
					RED.log.error("[rtdb:plugin]: The Config Node version does not meet the requirements of this palette.");
					RED.log.error("\tRequired Version: " + requiredVersion.join("."));
					RED.log.error("\tCurrent Version:  " + status.version);
					RED.log.error("\tTo resolve the issue, run:\n\ncd ~/.node-red\nnpm update --omit=dev\n");
				}
			} else {
				RED.log.error("[rtdb:plugin]: Config node NOT registered");

				let configNodeLoadable = false;
				try {
					configNodeLoadable = isConfigNodeLoadable(RED);
				} catch (error) {
					RED.log.warn("[rtdb:plugin]: " + (error as Error).message);
				}

				if (configNodeLoadable) {
					RED.log.warn("[rtdb:plugin]: Please restart Node-RED to load the config node");
					status.loadable = true;
				} else {
					RED.log.warn("[rtdb:plugin]: The config node was not installed in the correct directory by NPM");
					RED.log.warn("[rtdb:plugin]: Please run:\n\ncd ~/.node-red\nnpm update --omit=dev\n");
				}
			}
		} catch (error) {
			RED.log.warn("[rtdb:plugin]: Unable to determine the config node version");
			RED.log.debug("[rtdb:plugin]: Failed to load 'getModuleInfo': " + error);
			// Checker failed; config node may have been loaded correctly - let the user worry about that
			Firebase.configNodeSatisfiesVersion = true;
		}

		// To do a once event
		RED.events.off("runtime-event", checker);
		RED.events.off("flows:started", checker);
	};

	// Check if the Config Node version satisfies the require one
	RED.httpAdmin.get(
		"/firebase/rtdb/config-node/status",
		RED.auth.needsPermission("firebase-out.write"),
		function (_req, res) {
			RED.log.debug("[rtdb:plugin]: GET '/config-node/status'");
			res.json(status);
		}
	);

	// Run the Update/Load Script
	RED.httpAdmin.put(
		"/firebase/rtdb/config-node/scripts",
		RED.auth.needsPermission("firebase-out.write"),
		async function (req, res) {
			try {
				const scriptName = req.body.script;

				RED.log.debug("[rtdb:plugin]: PUT '/config-node/scripts' for " + scriptName);

				if (scriptName === "update-dependencies") {
					if (status.updateScriptCalled) throw new Error("Update Script already called");

					// For now, we assume that the script can only be triggered once even if it fails.
					status.updateScriptCalled = true;

					const { exec } = loadInternalNRModule<Util>("@node-red/util");

					RED.log.warn("[rtdb:plugin]: Starting to update nodes dependencies...");

					await runUpdateDependencies(RED, exec);

					// TODO: Green with chalk
					RED.log.info("[rtdb:plugin]: Successfully updated nodes dependencies. Please restart Node-RED.");
				} else if (scriptName === "load-plugins") {
					// Plugins are not loaded into the editor after installation by Palette Manager. See NR#5277.
					const { getModuleInfo } = loadInternalNRModule<Registry>("@node-red/registry");
					const info = getModuleInfo("@gogovega/node-red-contrib-firebase-realtime-database");

					// Notify the editor to load plugins
					RED.events.emit("runtime-event", { id: "plugin/added", retain: false, payload: info?.plugins || [] });

					res.sendStatus(204);
					return;
				} else {
					// Forbidden
					res.sendStatus(403);
					return;
				}

				res.json({ status: "success" });
			} catch (error) {
				const msg = error instanceof Error ? error.toString() : (error as Record<"stderr", string>).stderr;
				const action: Record<string, string> = {
					"update-dependencies": "updating nodes dependencies",
					"load-plugins": "notifying the editor to load plugins",
				};

				RED.log.error(`[rtdb:plugin]: An error occurred while ${action[req.body.script]}: ` + msg);

				res.json({
					status: "error",
					msg: msg,
				});
			}
		}
	);

	// Register the plugin
	RED.plugins.registerPlugin("rtdb-config-node-checker", {
		type: "firebase-config-node-checker",
		onadd: function () {
			RED.log.debug("[rtdb:plugin]: Firebase Config Node Checker started");

			// On plugin added - called during installation by Palette Manager
			// On missing node types - called during NR startup
			RED.events.on("runtime-event", checker);
			// For new/clean install - called during NR startup
			RED.events.on("flows:started", checker);
		},
		// @ts-expect-error: unknown property
		onremove: function () {
			RED.log.debug("[rtdb:plugin]: Stopping Firebase Config Node Checker...");

			// TODO: use module.dependencies - NR#5285
			const handler = function () {
				RED.events.off("runtime-event", handler);

				try {
					if (status.loaded && !isConfigNodeLoadable(RED)) {
						RED.log.warn("[rtdb:plugin]: Starting to remove the config node...");

						const { removeModule } = loadInternalNRModule<Registry>("@node-red/registry");
						const info = removeModule("@gogovega/firebase-config-node");

						// Notify the editor to remove the node
						RED.log.info(RED._("runtime:server.removed-types"));
						RED.log.info(" - @gogovega/firebase-config-node:firebase-config");
						RED.events.emit("runtime-event", { id: "node/removed", retain: false, payload: info });
					} else {
						RED.log.debug("[rtdb:plugin]: Skip removing config node module");
					}
				} catch (error) {
					RED.log.error("[rtdb:plugin]: An error occurred while removing config node module: " + error);
				}

				RED.log.debug("[rtdb:plugin]: Firebase Config Node Checker stopped");
			};

			// Wait for NPM to finish uninstalling this palette
			RED.events.on("runtime-event", handler);
		},
	});
};
