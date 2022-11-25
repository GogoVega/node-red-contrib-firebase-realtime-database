const { get, ref } = require("firebase/database");

module.exports = function (RED) {
	function FirebaseGetNode(config) {
		RED.nodes.createNode(this, config);

		this.database = RED.nodes.getNode(config.database);
		this.database.nodes.push(this);

		this.on("input", function (msg, send, done) {
			const path = (config.pathType === "msg" ? msg[config.path] : config.path) || undefined;

			if (path && typeof path !== "string") {
				done("PATH must be a string!");
				return;
			}
			if (path?.match(/[.#$\[\]]/g)) {
				done(`PATH must not contain ".", "#", "$", "[", or "]"`);
				return;
			}

			get(ref(this.database.db, path))
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
