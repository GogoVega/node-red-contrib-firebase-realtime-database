#!/usr/bin/env node

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

const { join } = require("node:path");
const { existsSync, readFileSync, rmSync, writeFileSync } = require("node:fs");

const ITERATION_LIMIT = 10;

const backupName = ".migration.flows.json.backup";

const flowFile = process.env.FLOW_FILE || "flows.json";
const onlyBreakingChanges = process.env.ONLY_BREAKING ? (process.env.ONLY_BREAKING === "true" ? true : false) : false;
const removeBackup = process.env.REMOVE_BACKUP ? (process.env.REMOVE_BACKUP === "true" ? true : false) : true;
const userDir = process.env.USER_DIR || join(__dirname, "../../../../");

const firebaseType = ["firebase-in", "firebase-get", "firebase-out", "on-disconnect"];
const oldConfigName = "database-config";
const newConfigName = "firebase-config";

const defaultFirebaseINNode = {
	id: "",
	type: "firebase-in",
	z: "",
	g: "",
	name: "",
	constraints: {},
	database: "",
	inputs: 0,
	listenerType: "",
	outputType: "",
	passThrough: false,
	path: "",
	pathType: "",
	useConstraints: false,
	x: 0,
	y: 0,
	wires: [],
};

const defaultFirebaseGETNode = {
	id: "",
	type: "firebase-get",
	z: "",
	g: "",
	name: "",
	constraints: {},
	database: "",
	outputType: "",
	passThrough: false,
	path: "",
	pathType: "",
	useConstraints: false,
	x: 0,
	y: 0,
	wires: [],
};

class MigrationError extends Error {
	constructor(message) {
		super(message);
	}
}

try {
	const path2FlowFile = join(userDir, flowFile);
	const flowFileExist = existsSync(path2FlowFile);
	const hasBackupInvalidPath = (file) => file.exists;
	const backupFile = {
		id: -1,
		name: "",
		path: "",
		exists: true,
	};

	console.log("1. Check if the flow file exist...");

	if (!flowFileExist)
		throw new MigrationError(`Unable to find the flow file at ${path2FlowFile}\n Please use --user-dir to resolve the user directory.`);

	console.log("   The flow file exist!");
	console.log("2. Creating the backup file...");

	while (hasBackupInvalidPath(backupFile)) {
		if (backupFile.id >= ITERATION_LIMIT) throw new MigrationError("You have exceeded the backup limit! Please delete some.");

		backupFile.id++;
		backupFile.name = backupFile.id === 0 ? backupName : `${backupName}.${backupFile.id}`;
		backupFile.path = join(userDir, backupFile.name);
		backupFile.exists = existsSync(backupFile.path);
	}

	const content = readFileSync(path2FlowFile, { encoding: "utf8" });

	writeFileSync(backupFile.path, content, { encoding: "utf8" });

	console.log("   Backup successful, the file is named: ", backupFile.name);
	console.log("3. Analyzing your flow file...");

	const flows = JSON.parse(content);

	if (!Array.isArray(flows)) throw new TypeError("The flow file is not an array.");

	const oldConfigNodes = flows
		.filter((flow) => flow.type === oldConfigName && "authType" in flow)
		.map((node) => node.id);

	const configNodes = flows
		.filter((flow) => firebaseType.includes(flow.type) && "database" in flow && "path" in flow)
		.map((node) => node.database)
		.filter((id, index, array) => array.indexOf(id) === index);

	// Double check to be sure
	const result = oldConfigNodes.filter((id) => configNodes.includes(id));

	// Change the type
	let newFlows = flows.map((flow) => {
		if (result.includes(flow.id)) flow.type = newConfigName;
		return flow;
	});

	console.log(`   Analysis complete!\n   Your flow file contains ${result.length} old config node(s).`);

	if (!onlyBreakingChanges) {
		const changes = { "firebase-in": 0, "firebase-get": 0, "firebase-out": 0 };
		newFlows = newFlows
			.map((flow) => {
				if (firebaseType.includes(flow.type) && "database" in flow && "path" in flow) {
					if (flow.type === "firebase-in" || flow.type === "firebase-get") {
						changes[flow.type]++;

						if ("constraint" in flow) {
							if (typeof flow.constraint === "object" && flow.constraint) {
								flow.constraints = migrateQueryConstraints(flow.constraint);
								delete flow.constraint;
							}
						}

						if ("useConstraint" in flow) {
							flow.useConstraints = flow.useConstraint ?? false;
							delete flow.useConstraint;
						}

						if (flow.type === "firebase-in") {
							if (!("pathType" in flow)) flow.pathType = "str";
							if (!("passThrough" in flow)) flow.passThrough = false;
							if (!("inputs" in flow)) flow.inputs = 0;
						}
					} else if (flow.type === "firebase-out") {
						changes[flow.type]++;

						if ("priority" in flow && !flow.priority) flow.priority = "1";
					}
				}
				return flow;
			})
			// Sort properties
			.reduce((newFlow, flow) => {
				if (flow.type === "firebase-in" && "database" in flow && "path" in flow) {
					newFlow.push({
						...defaultFirebaseINNode,
						...flow,
					});
				} else if (flow.type === "firebase-get" && "database" in flow && "path" in flow) {
					newFlow.push({
						...defaultFirebaseGETNode,
						...flow,
					});
				} else {
					newFlow.push(flow);
				}

				return newFlow;
			}, []);

		console.log(`   Your flow file contains ${changes["firebase-in"]} Firebase IN node(s).`);
		console.log(`   Your flow file contains ${changes["firebase-get"]} Firebase GET node(s).`);
		console.log(`   Your flow file contains ${changes["firebase-out"]} Firebase OUT node(s).`);
	}

	const newFlows2Write = JSON.stringify(newFlows, null, 4);
	const writeFile = content !== newFlows2Write;

	console.log("4. Writing your new flow file...");

	if (writeFile) {
		writeFileSync(path2FlowFile, newFlows2Write, { encoding: "utf8" });
		console.log("   Successfully writted!");
	} else {
		console.log("   No changes! Skip Writing.");
	}

	if (removeBackup) {
		console.log("5. Deleting the backup file...");
		rmSync(backupFile.path);
		console.log("   Successfully deleted!");
	}

	console.log(
		"\nThis Migration Wizard has now finished its job\nPlease restart Node-RED and reload your browser\nEnjoy!"
	);
} catch (error) {
	console.error("An error occurred during the Migration Wizard:\n", error);
	if (!(error instanceof MigrationError))
		console.error("Please raise an issue at https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/issues/new/choose with log details.");
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
