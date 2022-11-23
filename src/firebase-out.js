const { remove, ref, push, set, update } = require("firebase/database");

module.exports = function (RED) {
	function FirebaseOutNode(config) {
		RED.nodes.createNode(this, config);

		this.database = RED.nodes.getNode(config.database);
		this.database.nodes.push(this);

		this.on("input", function (msg, send, done) {
			const path = config.pathType === "msg" ? msg[config.path] : config.path;

			if (path === undefined) {
				done("The msg containing the PATH do not exist!");
				return;
			}
			if (!path) {
				done("PATH must be non-empty string!");
				return;
			}
			if (typeof path !== "string") {
				done("PATH must be a string!");
				return;
			}
			if (path.match(/[.#$\[\]]/g)) {
				done(`PATH must not contain ".", "#", "$", "[", or "]"`);
				return;
			}

			try {
				switch (config.queryType) {
					case "set":
						set(ref(this.database.db, path), msg.payload).then(() => done());
						break;
					case "push":
						push(ref(this.database.db, path), msg.payload).then(() => done());
						break;
					case "update":
						update(ref(this.database.db, path), msg.payload).then(() => done());
						break;
					case "remove":
						remove(ref(this.database.db, path)).then(() => done());
						break;
				}
			} catch (error) {
				done(error);
			}
		});
	}

	RED.nodes.registerType("firebase-out", FirebaseOutNode);
};
