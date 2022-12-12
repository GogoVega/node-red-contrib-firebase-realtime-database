function isPathValid(path, empty = false) {
	if (!empty && path === undefined) return "The msg containing the PATH do not exist!";
	if (!empty && !path) return "PATH must be non-empty string!";
	if (path && typeof path !== "string") return "PATH must be a string!";
	if (path?.match(/[.#$\[\]]/g)) return `PATH must not contain ".", "#", "$", "[", or "]"`;
	return;
}

function isQueryValid(method) {
	const { queryMethods } = require("../const/firebaseNode");

	if (method === undefined) return "msg.method do not exist!";
	if (!queryMethods.includes(method)) return `msg.method must be ${queryMethods.toString()}`;
	return;
}

async function makeGetQuery(db, path, admin = false, constraints = {}) {
	const pathParsed = parsePath(path, true);

	if (admin) {
		const database = pathParsed ? db.ref().child(pathParsed) : db.ref();
		const { queryConstraints } = require("../const/firebaseNode");

		for (const [method, value] of Object.entries(constraints)) {
			if (!queryConstraints.includes(method))
				throw new Error(`Query constraint received: '${method}' but must be one of ${queryConstraints.toString()}`);
			database[method](value);
		}

		return database.get();
	} else {
		const { get, ref, query } = require("firebase/database");

		return get(query(ref(db, pathParsed), ...parseQueryConstraints(constraints)));
	}
}

function parsePath(path, empty = false) {
	if (!empty && path === undefined) throw new Error("The msg containing the PATH do not exist!");
	if (!empty && !path) throw new Error("PATH must be non-empty string!");
	if (path && typeof path !== "string") throw new Error("PATH must be a string!");
	if (path?.match(/[.#$\[\]]/g)) throw new Error(`PATH must not contain ".", "#", "$", "[", or "]"`);
	return path;
}

function parseQueryConstraints(raw = {}) {
	const database = require("firebase/database");
	const { queryConstraints } = require("../const/firebaseNode");
	const query = [];

	if (typeof raw !== "object") throw new Error("Query constraints must be an object!");

	for (const [method, value] of Object.entries(raw)) {
		if (!queryConstraints.includes(method))
			throw new Error(`Query constraint received: '${method}' but must be one of ${queryConstraints.toString()}.`);
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
