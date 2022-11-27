const { onValue, ref, off } = require("firebase/database");

module.exports = function (RED) {
	function FirebaseInNode(config) {
		const node = this;

		RED.nodes.createNode(this, config);

		this.database = RED.nodes.getNode(config.database);

		if (!this.database) {
			this.error("Database not configured!");
			return;
		}

		this.database.nodes.push(this);

		const path = config.path?.toString() || undefined;
		if (path?.match(/[.#$\[\]]/g)) {
			this.error(`PATH must not contain ".", "#", "$", "[", or "]"`);
			return;
		}

		function onValueSDK(snapshot) {
			if (!snapshot.exists()) return;

			const ref = snapshot.ref.toString();
			const topic = ref.split(snapshot.ref.root.toString()).pop();
			const payload = config.outputType === "auto" ? snapshot.val() : JSON.stringify(snapshot.val());

			node.send({ payload: payload, topic: topic });
		}

		if (this.database.config.authType === "privateKey") {
			const databaseRef = path ? this.database.db.ref().child(path) : this.database.db.ref();
			databaseRef.on(
				"value",
				(snapshot) => onValueSDK(snapshot),
				(error) => this.warn(error)
			);
		} else {
			onValue(
				ref(this.database.db, path),
				(snapshot) => onValueSDK(snapshot),
				(error) => this.warn(error)
			);
		}

		// Remove the old listener to save the new one
		// If the node is disabled/deleted there will be no call to the onValue function
		this.on("close", function () {
			if (this.database.config.authType === "privateKey") {
				const databaseRef = path ? this.database.db.ref().child(path) : this.database.db.ref();
				databaseRef.off(
					"value",
					(snapshot) => onValueSDK(snapshot),
					(error) => this.warn(error)
				);
			} else {
				off(ref(this.database.db, path), "value");
			}
		});
	}

	RED.nodes.registerType("firebase-in", FirebaseInNode);
};
