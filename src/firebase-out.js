const firebase = require("firebase/database");

module.exports = function (RED) {
	function FirebaseOutNode(config) {
		const { isPathValid, isQueryValid, removeNode, setNodeStatus } = require("./lib/firebaseNode");

		RED.nodes.createNode(this, config);

		this.database = RED.nodes.getNode(config.database);

		if (!this.database) {
			this.error("Database not configured!");
			return;
		}

		this.database.nodes.push(this);

		setNodeStatus(this, this.database.connected);

		this.on("input", function (msg, send, done) {
			const path = config.pathType === "msg" ? msg[config.path] : config.path;
			const query = config.queryType === "none" ? msg.method : config.queryType;
			const pathNoValid = isPathValid(path);
			const queryNoValid = isQueryValid(query);

			if (pathNoValid || queryNoValid) {
				done(pathNoValid || queryNoValid);
				return;
			}

			if (this.database.config.authType === "privateKey") {
				/* eslint-disable no-unexpected-multiline */
				this.database.db
					.ref()
					.child(path)
					[query](msg.payload)
					.then(() => done())
					.catch((error) => done(error));
			} else {
				firebase[query](firebase.ref(this.database.db, path), msg.payload)
					.then(() => done())
					.catch((error) => done(error));
			}
		});

		this.on("close", () => removeNode(this.database.nodes, this.id));
	}

	RED.nodes.registerType("firebase-out", FirebaseOutNode);
};
