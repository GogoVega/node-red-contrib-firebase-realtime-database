const { remove, ref, push, set, update } = require("firebase/database");

module.exports = function (RED) {
	function FirebaseOutNode(config) {
		RED.nodes.createNode(this, config);

		this.database = RED.nodes.getNode(config.database);
		this.database.nodes.push(this);

		this.on("input", function (msg) {
			if (config.pathType === "msg") {
				if (msg[config.path] === undefined) {
					this.error("The msg contains PATH do not exist!");
					return;
				}
				if (typeof msg[config.path] !== "string") {
					this.error("PATH must be a string!");
					return;
				}
			}

			const path = config.pathType === "msg" ? msg[config.path] : config.path;

			switch (config.queryType) {
				case "set":
					set(ref(this.database.db, path), msg.payload).catch((error) => this.warn(error));
					break;
				case "push":
					push(ref(this.database.db, path), msg.payload).catch((error) => this.warn(error));
					break;
				case "update":
					update(ref(this.database.db, path), msg.payload).catch((error) => this.warn(error));
					break;
				case "remove":
					remove(ref(this.database.db, path)).catch((error) => this.warn(error));
					break;
			}
		});
	}

	RED.nodes.registerType("firebase-out", FirebaseOutNode);
};
