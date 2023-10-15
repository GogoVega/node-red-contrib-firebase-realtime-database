#!/usr/bin/env node

const { join } = require("node:path");
const { existsSync, readFileSync, rmSync, writeFileSync } = require("node:fs");

const backupName = ".migration.flows.json.backup";

const flowFile = process.env.FLOW_FILE || "flows.json";
const removeBackup = process.env.REMOVE_BACKUP ? (process.env.REMOVE_BACKUP === "true" ? true : false) : true;
const userDir = process.env.USER_DIR || join(__dirname, "../../../../");

const firebaseType = ["firebase-in", "firebase-get", "firebase-out", "on-disconnect"];
const oldConfigName = "database-config";
const newConfigName = "firebase-config";

try {
	const path2Backup = join(userDir, backupName);
	const path2FlowFile = join(userDir, flowFile);
	const backupExist = existsSync(path2Backup);
	const flowFileExist = existsSync(path2FlowFile);

	console.log("1. Check if the flow file exist...");

	if (!flowFileExist) throw new Error(`Unable to find the flow file at ${path2FlowFile}`);

	console.log("   The flow file exist!");
	console.log("2. Creating the backup file...");

	if (backupExist) throw new Error(`The backup file already exist at ${path2Backup}`);

	const content = readFileSync(path2FlowFile, { encoding: "utf8" });

	writeFileSync(path2Backup, content, { encoding: "utf8" });

	console.log("   Backup successful, the file is named: ", backupName);
	console.log("3. Analyzing your flow file...");

	const flows = JSON.parse(content);
	const configNode = [];
	const nodes = [];

	for (const item of flows) {
		if (firebaseType.includes(item.type)) {
			if (nodes.includes(item.database)) continue;
			nodes.push(item.database);
		}

		if (item.type !== oldConfigName) continue;

		configNode.push(item.id);
	}

	// Double check to be sure
	const result = configNode.reduce((acc, id) => {
		if (nodes.includes(id)) acc.push(id);
		return acc;
	}, []);

	// Change the type
	for (const item of flows) {
		if (result.includes(item.id)) item.type = newConfigName;
	}

	console.log(`   Analysis complete!\n   Your flow file contains ${result.length} config nodes.`);

	if (result.length > 0) {
		console.log("4. Writing your new flow file...");
		writeFileSync(path2FlowFile, JSON.stringify(flows), { encoding: "utf8" });
		console.log("   Successful writing!");
	}

	if (removeBackup) {
		console.log("5. Deleting the backup file...");
		rmSync(path2Backup);
		console.log("   Deletion successful!");
	}

	console.log(
		"\nThis migration assistant has now finished its job\nPlease restart Node-RED and reload your browser\nEnjoy!"
	);
} catch (error) {
	console.error("An error occurred:\n", error);
}
