#!/usr/bin/env node

const { join } = require("node:path");
const { existsSync, readFileSync, rmSync, writeFileSync } = require("node:fs");

const ITERATION_LIMIT = 10;

const backupName = ".migration.flows.json.backup";

const flowFile = process.env.FLOW_FILE || "flows.json";
const removeBackup = process.env.REMOVE_BACKUP ? (process.env.REMOVE_BACKUP === "true" ? true : false) : true;
const userDir = process.env.USER_DIR || join(__dirname, "../../../../");

const firebaseType = ["firebase-in", "firebase-get", "firebase-out", "on-disconnect"];
const oldConfigName = "database-config";
const newConfigName = "firebase-config";

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

	if (!flowFileExist) throw new Error(`Unable to find the flow file at ${path2FlowFile}`);

	console.log("   The flow file exist!");
	console.log("2. Creating the backup file...");

	while (hasBackupInvalidPath(backupFile)) {
		if (backupFile.id >= ITERATION_LIMIT)
			throw new Error("You have exceeded the backup limit! Please delete some.");

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

	const configNodes = flows
		.filter((flow) => flow.type === oldConfigName)
		.map((node) => node.id);

	const nodes = flows
		.filter((flow) => firebaseType.includes(flow.type))
		.map((node) => node.database)
		.filter((id, index, array) => array.indexOf(id) === index);

	// Double check to be sure
	const result = configNodes.filter((id) => nodes.includes(id));

	// Change the type
	const newFlows = flows.map((flow) => {
		if (result.includes(flow.id)) flow.type = newConfigName;
		return flow;
	});

	console.log(`   Analysis complete!\n   Your flow file contains ${result.length} config nodes.`);

	if (result.length > 0) {
		console.log("4. Writing your new flow file...");
		writeFileSync(path2FlowFile, JSON.stringify(newFlows, null, 4), { encoding: "utf8" });
		console.log("   Successfully writted!");
	}

	if (removeBackup) {
		console.log("5. Deleting the backup file...");
		rmSync(backupFile.path);
		console.log("   Successfully deleted!");
	}

	console.log(
		"\nThis migration wizard has now finished its job\nPlease restart Node-RED and reload your browser\nEnjoy!"
	);
} catch (error) {
	console.error("An error occurred:\n", error);
}
