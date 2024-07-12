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
						} else if (button === "Confirm Install") {
							const path = "firebase/rtdb/config-node/scripts";
							return {
								text: "Confirm",
								click: (event) => {
									RED.utils.addSpinnerOverlay($(event.target));

									FirebaseUI.express.post(path, { script: "install" }).then((resp) => {
										myNotification.close();
										notify(resp.notifications);
									});
								}
							};
						} else if (button === "Confirm Migrate") {
							return {
								text: "Confirm",
								click: (event) => {
									RED.utils.addSpinnerOverlay($(event.target));

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
													<p>Please raise an issue <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/issues/new/choose">here</a> with browser log details</p>
												</html>`,
											type: "error",
											fixed: true,
											buttons: ["Close"],
										}]);
									}
									myNotification.close();
								}
							};
						} else if (button === "Run Migrate" || button === "Run Install") {
							return {
								text: button,
								class: "pull-left",
								click: () => {
									myNotification.close();
									notify([{
										msg: `
											<html>
												<p>Are you really sure you want to do this?</p>
												<p>The ${button === "Run Migrate" ? "Migration" : "Install"} script will follow the steps described <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/wiki/migration-wizard">here</a>.</p>
											</html>`,
										modal: true, fixed: true, type: "warning", buttons: [`Confirm ${button === "Run Migrate" ? "Migrate" : "Install"}`, "Cancel"]
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
		const msg = `
			<html>
				<p>Welcome to Migration Wizard</p>
				<p>To use the new config-node introduced by v0.6 without losing the existing configuration, please run the Migration script.</p>
				<p>Read more about this migration <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/discussions/50">here</a>.</p>
			</html>`;
		const msg2 = `
			<html>
				<p>Welcome to Migration Wizard</p>
				<p>To use the new config-node introduced by v0.6, please restart Node-RED. If you are using FlowFuse, suspend then start the instance.</p>
				<p>If you have installed from the Manage Palette you need to restart because Node-RED did not load all nodes correctly.</p>
				<p>Read more about this migration <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/discussions/50">here</a>.</p>
			</html>`;

		notify([{
			msg: script === "migrate" ? msg : msg2,
			type: "warning",
			fixed: true,
			modal: true,
			buttons: script === "migrate" ? ["Run Migrate", "Close"] : ["Close"],
		}]);
	}

	async function init() {
		try {
			console.log("Firebase Migration Wizard Started");

			// Add the script to actions in order to run manually
			RED.actions.add("firebase:run-firebase-migration", () => generateNotification("migrate"));

			// Triggers the Migrate script if old config-node still in use
			if (isOldConfigNodeStillInUse()) generateNotification("migrate");

			// Triggers the Install script if the new config-nod was not found
			const status = await FirebaseUI.express.get("firebase/rtdb/config-node/status");

			// If the config-node was found, check if it was loaded
			if (!status.notifications.length && installFromPaletteManager()) generateNotification("install");

			notify(status.notifications);
		} catch (error) {
			console.error("An error occurred while checking the status of the config-node", error);
		}
	}

	setTimeout(init, 500);
})();