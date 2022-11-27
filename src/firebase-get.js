const { get, ref } = require("firebase/database");

module.exports = function (RED) {
	function FirebaseGetNode(config) {
		RED.nodes.createNode(this, config);

		this.database = RED.nodes.getNode(config.database);

		if (!this.database) {
			this.error("Database not configured!");
			return;
		}

		this.database.nodes.push(this);

		this.on("input", function (msg, send, done) {
			const path = (config.pathType === "msg" ? msg[config.path] : config.path) || undefined;
			const { isPathValid } = require("./lib/firebaseNode");
			const pathNoValid = isPathValid(path, true);

			if (pathNoValid) {
				done(pathNoValid);
				return;
			}

			const snapshot =
				this.database.config.authType === "privateKey"
					? path
						? this.database.db.ref().child(path).get()
						: this.database.db.ref().get()
					: get(ref(this.database.db, path));
			snapshot
				.then((snapshot) => {
					if (!snapshot.exists()) return;

					const ref = snapshot.ref.toString();
					const topic = ref.split(snapshot.ref.root.toString()).pop();
					const payload = config.outputType === "auto" ? snapshot.val() : JSON.stringify(snapshot.val());

					send({ payload: payload, topic: topic });
					done();
				})
				.catch((error) => done(error));
		});
	}

	RED.nodes.registerType("firebase-get", FirebaseGetNode);
};
