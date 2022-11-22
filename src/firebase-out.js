const { remove, ref, push, set, update } = require("firebase/database");

module.exports = function (RED) {
	function FirebaseOutNode(config) {
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

			try {
				switch (config.queryType) {
					case "set":
						set(ref(this.database.db, path), msg.payload);
						break;
					case "push":
						push(ref(this.database.db, path), msg.payload);
						break;
					case "update":
						update(ref(this.database.db, path), msg.payload);
						break;
					case "remove":
						remove(ref(this.database.db, path));
						break;
				}
			} catch (error) {
				this.warn(error);
			}
		});
	}

	RED.nodes.registerType("firebase-out", FirebaseOutNode);
};
