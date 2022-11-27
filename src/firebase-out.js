const firebase = require("firebase/database");

module.exports = function (RED) {
	function FirebaseOutNode(config) {
		RED.nodes.createNode(this, config);

		this.database = RED.nodes.getNode(config.database);

		if (!this.database) {
			this.error("Database not configured!");
			return;
		}

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

			if (this.database.config.authType === "privateKey") {
				/* eslint-disable no-unexpected-multiline */
				this.database.db
					.ref()
					.child(path)
					[config.queryType](msg.payload)
					.then(() => done())
					.catch((error) => done(error));
			} else {
				firebase[config.queryType](firebase.ref(this.database.db, path), msg.payload)
					.then(() => done())
					.catch((error) => done(error));
			}
		});
	}

	RED.nodes.registerType("firebase-out", FirebaseOutNode);
};
