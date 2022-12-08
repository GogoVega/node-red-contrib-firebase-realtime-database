function isPathValid(path, empty = false) {
	if (!empty && path === undefined) return "The msg containing the PATH do not exist!";
	if (!empty && !path) return "PATH must be non-empty string!";
	if (path && typeof path !== "string") return "PATH must be a string!";
	if (path?.match(/[.#$\[\]]/g)) return `PATH must not contain ".", "#", "$", "[", or "]"`;
	return;
}

function isQueryValid(method) {
	if (method === undefined) return "msg.method do not exist!";
	if (!["set", "push", "update", "remove"].includes(method))
		return "msg.method must be 'set', 'push', 'update' or 'remove'";
	return;
}

async function makeGetQuery(db, path, admin = false, constraints = {}) {
	if (admin) {
		const database = path ? db.ref().child(path) : db.ref();
		const { queryValid } = require("../const/firebaseNode");

		for (const [method, value] of Object.entries(constraints)) {
			if (!queryValid.includes(method))
				throw new Error(`Query received: '${method}'but must be one of ${queryValid.toString()}`);
			database[method](value);
		}

		return database.get();
	} else {
		const { get, ref, query } = require("firebase/database");

		return get(query(ref(db, path), ...parseQueryConstraints(constraints)));
	}
}

function parseQueryConstraints(raw = {}) {
	const database = require("firebase/database");
	const { queryValid } = require("../const/firebaseNode");
	const query = [];

	for (const [method, value] of Object.entries(raw)) {
		if (!queryValid.includes(method))
			throw new Error(`Query received: '${method}'but must be one of ${queryValid.toString()}`);
		query.push(database[method](value));
	}

	return query;
}

function removeNode(nodes = [], nodeId) {
	nodes.some((node) => {
		if (node.id !== nodeId) return;
		nodes.splice(nodes.indexOf(node), 1);
	});
}

function setNodeStatus(self, connected = false) {
	if (connected) {
		self.status({ fill: "green", shape: "dot", text: "connected" });
	} else {
		self.status({ fill: "yellow", shape: "ring", text: "connecting" });
	}
}

module.exports = { isPathValid, isQueryValid, makeGetQuery, removeNode, setNodeStatus };
