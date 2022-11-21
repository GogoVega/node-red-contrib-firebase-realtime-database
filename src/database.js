const { getAuth, signInAnonymously, signInWithEmailAndPassword } = require("firebase/auth");
const { initializeApp } = require("firebase/app");
const { getDatabase } = require("firebase/database");

module.exports = function (RED) {
	function DatabaseNode(config) {
		RED.nodes.createNode(this, config);
		console.log("DATABASE");
		var node = this;
		this.nodes = [];

		const app = initializeApp({
			apiKey: this.credentials.apiKey,
			databaseURL: this.credentials.url,
		});

		const auth = getAuth(app);

		function setNodeStatus(state) {
			for (var n of node.nodes) {
				n.status(state);
			}
		}

		switch (config.authType) {
			case "anonymous":
				signInAnonymously(auth)
					.then(() => setNodeStatus({ fill: "green", shape: "dot", text: "connected" }))
					.catch((error) => {
						node.error(error);
						setNodeStatus({ fill: "red", shape: "dot", text: "disconnected" });
					});
				break;
			case "email":
				signInWithEmailAndPassword(auth, this.credentials.email, this.credentials.password)
					.then(() => setNodeStatus({ fill: "green", shape: "dot", text: "connected" }))
					.catch((error) => {
						node.error(error);
						setNodeStatus({ fill: "red", shape: "dot", text: "disconnected" });
					});
				break;
		}

		const database = getDatabase(app);

		this.app = app;
		this.db = database;
	}

	RED.nodes.registerType("database", DatabaseNode, {
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
