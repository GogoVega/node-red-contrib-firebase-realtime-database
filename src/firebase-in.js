module.exports = function (RED) {
	function FirebaseInNode(config) {
		const {
			makeUnSubscriptionQuery,
			makeSubscriptionQuery,
			removeNodeStatus,
			setNodeStatus,
		} = require("./lib/firebaseNode");

		RED.nodes.createNode(this, config);

		this.database = RED.nodes.getNode(config.database);

		if (!this.database) {
			this.error("Database not configured!");
			return;
		}

		this.database.nodes.push(this);
		this.subscribed = false;

		setNodeStatus(this, this.database.connected);

		const listener = config.listenerType || "value";
		const path = config.path?.toString() || undefined;
		const string = config.outputType === "string";

		try {
			makeSubscriptionQuery(this, listener, path, string);
			this.subscribed = true;

			// Remove the old listener to save the new one
			// If the node is disabled/deleted there will be no call to the onValue function
			this.on("close", function () {
				removeNodeStatus(this.database.nodes, this.id);

				if (!this.subscribed) return;

				makeUnSubscriptionQuery(this, listener, path);
			});
		} catch (error) {
			this.error(error);
		}
	}

	RED.nodes.registerType("firebase-in", FirebaseInNode);
};
