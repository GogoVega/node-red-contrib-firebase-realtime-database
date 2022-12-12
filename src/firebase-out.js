module.exports = function (RED) {
	function FirebaseOutNode(config) {
		const { makeWriteQuery, removeNodeStatus, setNodeStatus } = require("./lib/firebaseNode");

		RED.nodes.createNode(this, config);

		this.database = RED.nodes.getNode(config.database);

		if (!this.database) {
			this.error("Database not configured!");
			return;
		}

		this.database.nodes.push(this);

		setNodeStatus(this, this.database.connected);

		this.on("input", function (msg, send, done) {
			const admin = this.database.config.authType === "privateKey";
			const path = config.pathType === "msg" ? msg[config.path] : config.path;
			const query = config.queryType === "none" ? msg.method : config.queryType;

			makeWriteQuery(this.database.db, path, query, msg.payload, admin)
				.then(() => done())
				.catch((error) => done(error));
		});

		this.on("close", () => removeNodeStatus(this.database.nodes, this.id));
	}

	RED.nodes.registerType("firebase-out", FirebaseOutNode);
};
