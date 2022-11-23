const { onValue, ref, off } = require("firebase/database");

module.exports = function (RED) {
	function FirebaseInNode(config) {
		RED.nodes.createNode(this, config);

		this.database = RED.nodes.getNode(config.database);
		this.database.nodes.push(this);

		const path = config.path?.toString() || undefined;
		if (path?.match(/[.#$\[\]]/g)) {
			this.error(`PATH must not contain ".", "#", "$", "[", or "]"`);
			return;
		}

		onValue(
			ref(this.database.db, path),
			(snapshot) => {
				if (!snapshot.exists()) return;

				const ref = snapshot.ref.toString();
				const topic = ref.split(snapshot.ref.root.toString()).pop();
				const payload = config.outputType === "auto" ? snapshot.val() : JSON.stringify(snapshot.val());

				this.send({ payload: payload, topic: topic });
			},
			(error) => this.warn(error)
		);

		// Remove the old listener to save the new one
		// If the node is disabled/deleted there will be no call to the onValue function
		this.on("close", function () {
			off(ref(this.database.db, path));
		});
	}

	RED.nodes.registerType("firebase-in", FirebaseInNode);
};
