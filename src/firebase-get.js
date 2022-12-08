module.exports = function (RED) {
	function FirebaseGetNode(config) {
		const { isPathValid, makeGetQuery, removeNode, setNodeStatus } = require("./lib/firebaseNode");

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
			const path = (config.pathType === "msg" ? msg[config.path] : config.path) || undefined;
			const queryConstraints = msg.method;
			const pathNoValid = isPathValid(path, true);

			if (pathNoValid) {
				done(pathNoValid);
				return;
			}

			makeGetQuery(this.database.db, path, admin, queryConstraints)
				.then((snapshot) => {
					if (!snapshot.exists()) return;

					const topic = snapshot.ref.key?.toString() || "";
					const payload = config.outputType === "auto" ? snapshot.val() : JSON.stringify(snapshot.val());

					send({ payload: payload, topic: topic });
					done();
				})
				.catch((error) => done(error));
		});

		this.on("close", () => removeNode(this.database.nodes, this.id));
	}

	RED.nodes.registerType("firebase-get", FirebaseGetNode);
};
