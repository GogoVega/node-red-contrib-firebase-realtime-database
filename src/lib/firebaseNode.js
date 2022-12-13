async function makeGetQuery(db, path = undefined, admin = false, constraints = {}) {
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

function makeUnSubscriptionQuery(node, listener, path = undefined) {
	const admin = node.database.config.authType === "privateKey";
	const db = node.database.db;

	// Do not remove the listener if the same path is used several times
	if (node.database.listeners[path ?? ""] > 1) {
		node.database.listeners[path ?? ""]--;
		return;
	}

	if (admin) {
		const databaseRef = path ? db.ref().child(path) : db.ref();

		databaseRef.off(listener);
	} else {
		const { ref, off } = require("firebase/database");

		off(ref(db, path), listener);
	}

	delete node.database.listeners[path ?? ""];
}

// TODO: Add others listeners
function makeSubscriptionQuery(node, listener, path = undefined, string = false) {
	const admin = node.database.config.authType === "privateKey";
	const db = node.database.db;
	const listenerParsed = parseListener(listener);
	const pathParsed = parsePath(path, true);

	if (admin) {
		const databaseRef = pathParsed ? db.ref().child(pathParsed) : db.ref();

		databaseRef.on(
			listenerParsed,
			(snapshot) => sendMsg(snapshot, node, string),
			(error) => node.error(error)
		);
	} else {
		const firebase = require("firebase/database");
		const { listeners } = require("../const/firebaseNode");

		firebase[listeners[listenerParsed]](
			firebase.ref(db, pathParsed),
			(snapshot) => sendMsg(snapshot, node, string),
			(error) => node.error(error)
		);
	}

	if (node.database.listeners[pathParsed ?? ""] === undefined) node.database.listeners[pathParsed ?? ""] = 0;
	node.database.listeners[pathParsed ?? ""]++;
}

// TODO: Add others methods
async function makeWriteQuery(db, path = undefined, query = undefined, payload = null, admin = false) {
	const pathParsed = parsePath(path);
	const queryParsed = parseQuery(query);

	if (admin) {
		return db.ref().child(pathParsed)[queryParsed](payload);
	} else {
		const firebase = require("firebase/database");

		return firebase[queryParsed](firebase.ref(db, pathParsed), payload);
	}
}

function parseListener(listener) {
	const { listeners } = require("../const/firebaseNode");
	const keys = Object.keys(listeners);

	if (!keys.includes(listener)) throw new Error(`msg.method must be ${keys.toString()}`);
	return listener;
}

function parsePath(path, empty = false) {
	if (!empty && path === undefined) throw new Error("The msg containing the PATH do not exist!");
	if (!empty && !path) throw new Error("PATH must be non-empty string!");
	if (path && typeof path !== "string") throw new Error("PATH must be a string!");
	if (path?.match(/[.#$\[\]]/g)) throw new Error(`PATH must not contain ".", "#", "$", "[", or "]"`);
	return path;
}

function parseQuery(method) {
	const { queryMethods } = require("../const/firebaseNode");

	if (method === undefined) throw new Error("msg.method do not exist!");
	if (!queryMethods.includes(method)) throw new Error(`msg.method must be ${queryMethods.toString()}`);
	return method;
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

function removeNodeStatus(nodes = [], nodeId) {
	nodes.forEach((node) => {
		if (node.id !== nodeId) return;
		nodes.splice(nodes.indexOf(node), 1);
	});
}

function sendMsg(snapshot, node, string = false) {
	try {
		if (!snapshot.exists()) return;

		const topic = snapshot.ref.key?.toString() || "";
		const payload = string ? JSON.stringify(snapshot.val()) : snapshot.val();

		node.send({ payload: payload, topic: topic });
	} catch (error) {
		node.error(error);
	}
}

function setNodeStatus(self, connected = false) {
	if (connected) {
		self.status({ fill: "green", shape: "dot", text: "connected" });
	} else {
		self.status({ fill: "yellow", shape: "ring", text: "connecting" });
	}
}

module.exports = {
	makeGetQuery,
	makeUnSubscriptionQuery,
	makeSubscriptionQuery,
	makeWriteQuery,
	parsePath,
	parseQueryConstraints,
	removeNodeStatus,
	setNodeStatus,
};
