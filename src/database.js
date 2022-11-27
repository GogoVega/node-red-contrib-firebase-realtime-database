module.exports = function (RED) {
	function DatabaseNode(config) {
		const { logIn, logOut, setNodesConnected, setNodesDisconnected } = require("./lib/databaseNode");

		RED.nodes.createNode(this, config);

		this.config = config;
		this.nodes = [];

		this.onError = function (msg) {
			this.error(msg);
			setNodesDisconnected(this);
		};

		logIn(this).then(() => setNodesConnected(this));

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
