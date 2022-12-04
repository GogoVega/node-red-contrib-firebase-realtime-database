module.exports = function (RED) {
	function DatabaseNode(config) {
		const { initConnectionStatus, logIn, logOut, setNodesDisconnected } = require("./lib/databaseNode");

		RED.nodes.createNode(this, config);

		this.connected = false;
		this.config = config;
		this.nodes = [];

		logIn(this)
			.then(() => initConnectionStatus(this))
			.catch((error) => {
				this.error(error);
				setNodesDisconnected(this);
			});

		this.on("close", (done) =>
			logOut(this)
				.then(() => done())
				.catch((error) => done(error))
		);
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
