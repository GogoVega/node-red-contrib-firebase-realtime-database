const { onValue, ref, off } = require("firebase/database");

module.exports = function (RED) {
	function FirebaseInNode(config) {
		RED.nodes.createNode(this, config);

		this.database = RED.nodes.getNode(config.database);
		this.database.nodes.push(this);

		onValue(ref(this.database.db, config.path), (snapshot) => {
			if (!snapshot.exists()) return;

			const ref = snapshot.ref.toString();
			const topic = ref.split(snapshot.ref.root.toString()).pop();
			const payload = config.outputType === "auto" ? snapshot.val() : JSON.stringify(snapshot.val());

			this.send({ payload: payload, topic: topic });
		});

		this.on("close", function () {
			off(ref(this.database.db, config.path));
		});
	}

	RED.nodes.registerType("firebase-in", FirebaseInNode);
};
