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
		if (!Array.isArray(notifications)) return;

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
										// TODO: Not robust because it does not guarantee that the user will deploy
										FirebaseUI.express.post("firebase/rtdb/config-node/scripts", { script: "migrate" });

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
													<p>Please raise an issue <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/issues/new/choose">here</a> with log details</p>
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

	function migrate() {
		const firebaseType = ["firebase-in", "firebase-get", "firebase-out", "on-disconnect"];
		const oldConfigName = "database-config";
		const newConfigName = "firebase-config";

		const historyEvent = { t: "multi", events: [] };
		const wasDirty =  RED.nodes.dirty();

		// Search for old config-node
		const oldConfigNodes = { nodes: [], importMap: {} };
		RED.nodes.eachConfig((node) => {
			if (node.type === "unknown" && node.name === node._orig.type && node._orig.type === oldConfigName && "authType" in node._orig) {

				// Replace the type by the new one
				node._orig.type = newConfigName;

				oldConfigNodes.nodes.push(RED.nodes.convertNode(node));
				oldConfigNodes.importMap[node.id] = "replace";
			}
		});

		if (oldConfigNodes.nodes.length) {
			// Import and replace by the new config-nodes
			const result = RED.nodes.import(oldConfigNodes.nodes, { importMap: oldConfigNodes.importMap, reimport: true });

			// Used for the undo event, so replace the type by the older
			const removedConfigNodes = result.removedNodes.map((node) => {
				node.type = oldConfigName;
				return node;
			});

			// @ts-ignore
			historyEvent.events.push({
				t: "replace",
				config: removedConfigNodes,
				dirty: wasDirty,
			});
		}

		RED.nodes.eachNode((node) => {
			if (firebaseType.includes(node.type) && "database" in node && "path" in node) {
				const changes = {};
				const wasChanged = node.changed;

				// Resolve the non-breaking changes
				if (node.type === "firebase-in" || node.type === "firebase-get") {
					if ("constraint" in node) {
						if (typeof node.constraint === "object" && node.constraint) {
							changes.constraint = node.constraint;
							changes.constraints = undefined;
							node.constraints = migrateQueryConstraints(node.constraint);
							delete node.constraint;
						}
					}

					if ("useConstraint" in node) {
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
					changes.priority = node.priority;
					node.priority = String(node.priority) || "1";
				}

				if (Object.keys(changes).length) {
					node.changed = true;

					RED.editor.validateNode(node);

					// @ts-ignore
					historyEvent.events.push({
						t: "edit",
						node: node,
						changes: changes,
						dirty: wasDirty,
						changed: wasChanged,
					});
				}
			}
		});

		if (!historyEvent.events.length) return;

		RED.nodes.dirty(true);
		// TODO: vérifier si utile
		RED.view.redraw(true);
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

	async function init() {
		try {
			console.log("Firebase Migration Wizard Started");
			const status = await FirebaseUI.express.get("firebase/rtdb/config-node/status");
			notify(status.notifications);
		} catch (error) {
			console.error("An error occurred while checking the status of the config-node", error);
		}
	}

	setTimeout(init, 500);
})();
