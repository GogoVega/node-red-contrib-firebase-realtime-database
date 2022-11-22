const { get, ref } = require("firebase/database");

module.exports = function (RED) {
	function FirebaseGetNode(config) {
		RED.nodes.createNode(this, config);

		this.database = RED.nodes.getNode(config.database);
		this.database.nodes.push(this);

		this.on("input", function (msg) {
			if (config.pathType === "msg") {
				if (msg[config.path] === undefined) {
					this.error("The msg containing the PATH do not exist!");
					return;
				}
				if (typeof msg[config.path] !== "string") {
					this.error("PATH must be a string!");
					return;
				}
			}

			const path = config.pathType === "msg" ? msg[config.path] : config.path;

			get(ref(this.database.db, path))
				.then((snapshot) => {
					if (!snapshot.exists()) return;

					const ref = snapshot.ref.toString();
					const topic = ref.split(snapshot.ref.root.toString()).pop();
					const payload = config.outputType === "auto" ? snapshot.val() : JSON.stringify(snapshot.val());

					this.send({ payload: payload, topic: topic });
				})
				.catch((error) => this.warn(error));
		});
	}

	RED.nodes.registerType("firebase-get", FirebaseGetNode);
};
