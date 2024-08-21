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

; (function () {
	"use strict";

	const notify = function (notifications) {
		if (!Array.isArray(notifications)) {
			notifications = [notifications];
		}

		notifications.forEach((notification) => {
			const { buttons, fixed, modal, msg, type } = notification;
			const myNotification = RED.notify(msg, {
				modal: modal,
				fixed: fixed,
				type: type,
				buttons: (function () {
					return buttons.map((button) => {
						if (button === "Close" || button === "Cancel") {
							return {
								text: button,
								class: "primary",
								click: () => {
									myNotification.close();
								}
							};
						} else if (button === "Undo") {
							return {
								text: button,
								click: () => {
									myNotification.close();
									RED.actions.invoke("core:undo");
								}
							};
						} else if (button === "View Changes") {
							return {
								text: button,
								class: "pull-left",
								click: () => {
									myNotification.close();
									RED.actions.invoke("core:show-remote-diff");
									// To avoid rewritting the changes
									setTimeout(() => $("#red-ui-diff-view-diff-merge").addClass("disabled"), 200);
								}
							};
						} else if (button === "View Log") {
							return {
								text: button,
								class: "pull-left",
								click: () => {
									RED.actions.invoke("core:show-event-log");
								}
							};
						} else if (button === "Confirm Update") {
							const path = "firebase/rtdb/config-node/scripts";

							return {
								text: "Confirm",
								click: (event) => {
									const spinner = RED.utils.addSpinnerOverlay($(event.target));

									// Start the event log panel
									RED.eventLog.startEvent("FIREBASE: Updating dependencies...");

									FirebaseUI.express.post(path, { script: "update-dependencies" }).then((resp) => {
										spinner.remove();
										myNotification.close();
										
										if (resp.status === "success") {
											notify({
												msg: "<html><p>Update Successful!</p><p>Restarts now Node-RED and reload your browser</p></html>",
												type: "success",
												fixed: true,
												buttons: ["Close"]
											});
										} else if (resp.status === "error") {
											notify({
												msg: `
												<html>
													<p>Update Failed!</p>
													<p>Please raise an issue <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/issues/new/choose">here</a> with log details:</p>
													<pre>${resp.msg}</pre>
												</html>`,
												type: "error",
												fixed: true,
												buttons: ["Close"],
											});
										} else {
											console.log("J'ai glissé chef!");
										}
									});
								}
							};
						} else if (button === "Confirm Migrate") {
							return {
								text: "Confirm",
								click: (event) => {
									const spinner = RED.utils.addSpinnerOverlay($(event.target));

									try {
										migrate();

										notify([{
											msg: `
												<html>
													<p>Migration Successful!</p>
												</html>`,
											type: "success",
											fixed: true,
											buttons: ["View Changes", "Undo", "Close"],
										}]);
									} catch (error) {
										console.error("Error occured while the Migration script: ", error);
										notify([{
											msg: `
												<html>
													<p>Migration Failed!</p>
													<p>Please raise an issue <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/issues/new/choose">here</a> with browser log details:</p>
													<pre>${error.toString()}</pre>
												</html>`,
											type: "error",
											fixed: true,
											buttons: ["Close"],
										}]);
									}

									spinner.remove();
									myNotification.close();
								}
							};
						} else if (button === "Run Migrate") {
							return {
								text: button,
								class: "pull-left",
								click: () => {
									myNotification.close();
									notify([{
										msg: `
											<html>
												<p>Are you really sure you want to do this?</p>
												<p>The Migrate script will follow the steps described <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/wiki/migration-wizard">here</a>.</p>
											</html>`,
										modal: true, fixed: true, type: "warning", buttons: ["Confirm Migrate", "Cancel"]
									}]);
								}
							};
						} else if (button === "Run Update") {
							return {
								text: button,
								class: "pull-left",
								click: () => {
									myNotification.close();
									notify([{
										msg: `
											<html>
												<p>Are you really sure you want to do this?</p>
												<p>The Update script will run <code>npm update</code> in your Node-RED directory to update dependencies.</p>
												<p><strong>Tip</strong>: Click on <strong>View Log</strong> then <strong>Confirm</strong> and not the other way around 🤫</p>
											</html>`,
										modal: false, fixed: true, type: "warning", buttons: ["Confirm Update", "View Log", "Cancel"]
									}]);
								}
							};
						} else {
							console.error("Unknown button", button);
						}
					});
				})(),
			});
		});
	};

	// Hosted services such as FlowFuse do not use a file system - so must migrate from the editor
	// More practical for the user (diff) and safest
	function migrate() {
		const firebaseType = ["firebase-in", "firebase-get", "firebase-out", "on-disconnect"];
		const oldConfigName = "database-config";
		const newConfigName = "firebase-config";

		// Used for the undo/redo changes
		const historyEvent = { t: "multi", events: [], dirty: RED.nodes.dirty() };

		const importMap = {};
		const newConfigNodes = [];
		// Search for old config-node
		RED.nodes.eachConfig((node) => {
			if (node.type === "unknown" && node.name === node._orig.type && node._orig.type === oldConfigName && "authType" in node._orig) {

				// Replace the type by the new one
				node._orig.type = newConfigName;

				// Need to convert the node because it's an unknown type
				// So properties are defined in `node._orig` instead of root of the node
				newConfigNodes.push(RED.nodes.convertNode(node));
				importMap[node.id] = "replace";
			}
		});

		if (newConfigNodes.length) {
			// Import and replace by the new config-nodes
			const result = RED.nodes.import(newConfigNodes, { importMap: importMap });

			// Used for the undo event, so replace the type by the older
			const oldConfigNodes = result.removedNodes.map((node) => {
				node.type = oldConfigName;
				return node;
			});

			// TODO: Config Nodes do not have `changed` property in the `replace` history
			// and `dirty` property is not used for that config nodes.
			// @ts-ignore
			historyEvent.events.push({
				t: "replace",
				config: oldConfigNodes
			});
		}

		RED.nodes.eachNode((node) => {
			if (firebaseType.includes(node.type) && "database" in node && "path" in node) {
				const wasChanged = node.changed;
				const wasDirty = node.dirty;
				const changes = {};

				// Resolve the non-breaking changes
				if (node.type === "firebase-in" || node.type === "firebase-get") {
					if (node.constraint !== undefined) {
						if (typeof node.constraint === "object" && node.constraint) {
							changes.constraint = node.constraint;
							changes.constraints = undefined;
							node.constraints = migrateQueryConstraints(node.constraint);
							delete node.constraint;
						}
					}

					if (node.useConstraint !== undefined) {
						changes.useConstraint = node.useConstraint;
						changes.useConstraints = undefined;
						node.useConstraints = node.useConstraint ?? false;
						delete node.useConstraint;
					}

					if (node.type === "firebase-in") {
						if (!node.pathType) {
							changes.pathType = undefined;
							node.pathType = "str";
						}
						if (node.passThrough == undefined) {
							changes.passThrough = undefined;
							node.passThrough = false;
						}
						if (node.inputs == undefined) {
							changes.inputs = undefined;
							node.inputs = 0;
						}
					}
				} else if (node.type === "firebase-out") {
					const priority = String(node.priority || "") || "1";
					if (node.priority !== priority) {
						changes.priority = node.priority;
						node.priority = priority;
					}
				}

				if (Object.keys(changes).length) {
					// Marks the node has changed
					node.changed = true;
					node.dirty = true;

					RED.events.emit("nodes:change", node);
					RED.editor.validateNode(node);

					// @ts-ignore
					historyEvent.events.push({
						t: "edit",
						node: node,
						changes: changes,
						changed: wasChanged,
						dirty: wasDirty
					});
				}

				// Bug in NR Core, see #4807
				// Not works for after undo changes
				RED.nodes.updateConfigNodeUsers(node);
			}
		});

		if (!historyEvent.events.length) return;

		RED.nodes.dirty(true);
		RED.view.redraw(true);
		RED.workspaces.refresh();
		RED.history.push(historyEvent);
	}

	function migrateQueryConstraints(constraints) {
		return Object.entries(constraints).reduce((constraints, [constraintName, value]) => {
			switch (constraintName) {
				case "endAt":
				case "endBefore":
				case "equalTo":
				case "startAfter":
				case "startAt":
					if (value.type === "date" || value.type === "null") value.value = "";
					constraints[constraintName] = {
						value: String(value.value ?? ""),
						key: String(value.key || ""),
						types: { value: value.type, child: "str" },
					};
					break;
				case "limitToFirst":
				case "limitToLast":
					constraints[constraintName] = { value: String(value), type: "num" };
					break;
				case "orderByChild":
					constraints[constraintName] = { value: value, type: "str" };
					break;
				case "orderByKey":
				case "orderByPriority":
				case "orderByValue":
					constraints[constraintName] = null;
					break;
			}
	
			return constraints;
		}, {});
	}

	function isOldConfigNodeStillInUse() {
		let inUse = false;

		RED.nodes.eachConfig((node) => {
			if (node.type === "unknown" && node.name === node._orig.type && node._orig.type === "database-config" && "authType" in node._orig) inUse = true;
		});

		return inUse;
	}

	function installFromPaletteManager() {
		return !RED.nodes.getType("firebase-config");
	}

	function generateNotification(script) {
		const migrateMsg = `
			<html>
				<p>Welcome to Migration Wizard</p>
				<p>To use the new Config Node introduced by v0.6 without losing the existing configuration, please run the Migration script.</p>
				<p>Read more about this migration <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/discussions/50">here</a>.</p>
			</html>`;
		const updateMsg = `
			<html>
				<p>Welcome to Firebase Realtime Databases</p>
				<p>The Config Node version don't meet the version required by the RTDB palette.</p>
				<p>Can happen when you use both <a href="https://flows.nodered.org/node/@gogovega/node-red-contrib-cloud-firestore">Cloud Firestore</a> 
				and RTDB palettes. Indeed NPM installs a new version into the wrong package instead of updating the existing one.</p>
				<p>To solve this issue, please run the Update script.</p>
			</html>`;
		const restartMsg = `
			<html>
				<p>Welcome to Firebase Realtime Databases</p>
				<p>To use the new Config Node introduced by v0.6, please restart Node-RED. If you are using FlowFuse, suspend then start the instance.</p>
				<p>If you have installed from the Manage Palette you need to restart because Node-RED did not load all nodes correctly.</p>
				<p>Read more about this issue <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/discussions/50">here</a>.</p>
			</html>`;
		const restartAfterUpdateMsg = `
			<html>
				<p>Don't forget to restart Node-RED!</p>
				<p>It looks like you didn't restart Node-RED after running the Update script 🙄</p>
			</html>`;

		let msg;
		let buttons = ["Close"];
		switch (script) {
			case "migrate":
				msg = migrateMsg;
				buttons = ["Run Migrate", "Close"];
				break;
			case "update":
				msg = updateMsg;
				buttons = ["Run Update", "Close"];
				break;
			case "restart":
				msg = restartMsg;
				break;
			case "restart-update":
				msg = restartAfterUpdateMsg;
				break;
			default:
				throw new Error("Unknown notification script: " + script);
		}

		notify([{
			msg: msg,
			type: "warning",
			fixed: true,
			modal: true,
			buttons: buttons,
		}]);
	}

	async function init() {
		try {
			console.log("Firebase Migration Wizard Started");

			// Add the script to actions in order to run manually
			RED.actions.add("firebase:run-firebase-migration", () => generateNotification("migrate"));

			if (installFromPaletteManager()) {
				// Config Node not loaded, so the user must restart NR
				generateNotification("restart");
				return;
			}

			// Research if the Config Node version satisfies the required version by this palette
			const status = await FirebaseUI.express.get("firebase/rtdb/config-node/status");

			if (!status.status.versionIsSatisfied) {
				if (status.status.updateScriptCalled) {
					// The user has triggered the Update script but not restarted NR
					generateNotification("restart-update");
				} else {
					// Ask the user to trigger the Update script
					generateNotification("update");
				}
			} else if (isOldConfigNodeStillInUse()) {
				// Now the Config Node has been loaded and the version is good
				// Triggers the Migrate script if old Config Node still in use
				generateNotification("migrate");
			}
		} catch (error) {
			console.error("An error occurred while checking the status of the config-node", error);
		}
	}

	setTimeout(init, 500);
})();
