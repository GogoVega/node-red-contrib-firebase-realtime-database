const { deleteApp, initializeApp } = require("firebase/app");
const { getAuth, signInAnonymously, signInWithEmailAndPassword } = require("firebase/auth");
const { getDatabase } = require("firebase/database");

module.exports = function (RED) {
	function DatabaseNode(config) {
		RED.nodes.createNode(this, config);

		const node = this;
		this.nodes = [];

		const app = initializeApp({
			apiKey: this.credentials.apiKey,
			databaseURL: this.credentials.url,
		});

		const auth = getAuth(app);

		function setNodesConnected() {
			for (const n of node.nodes) {
				n.status({ fill: "green", shape: "dot", text: "connected" });
			}
		}

		function setNodesDisconnected() {
			for (const n of node.nodes) {
				n.status({ fill: "red", shape: "dot", text: "disconnected" });
			}
		}

		try {
			// TODO: Add other authentication methods
			switch (config.authType) {
				case "anonymous":
					signInAnonymously(auth).then(() => setNodesConnected());
					break;
				case "email":
					// NOTE: Fails with an error if the email address and password do not match!
					signInWithEmailAndPassword(auth, this.credentials.email, this.credentials.password).then(() =>
						setNodesConnected()
					);
					break;
			}
		} catch (error) {
			node.error(error);
			setNodesDisconnected();
		}

		const database = getDatabase(app);

		this.app = app;
		this.db = database;

		node.on("close", function (done) {
			if (!node.app) {
				done();
				return;
			}

			deleteApp(node.app)
				.then(() => done())
				.catch((error) => done(error));
		});
	}

	RED.nodes.registerType("database-config", DatabaseNode, {
		credentials: {
			apiKey: { type: "text" },
			email: { type: "text" },
			json: { type: "password" },
			password: { type: "password" },
			secret: { type: "password" },
			url: { type: "text" },
		},
	});
};
