import { NodeAPI } from "node-red";
import { FirebaseIn } from "../lib/firebaseNode";
import { DatabaseNodeType } from "../lib/types/DatabaseNodeType";
import { FirebaseInConfigType } from "../lib/types/FirebaseConfigType";
import { FirebaseInNodeType } from "../lib/types/FirebaseNodeType";

module.exports = function (RED: NodeAPI) {
	function FirebaseInNode(this: FirebaseInNodeType, config: FirebaseInConfigType) {
		RED.nodes.createNode(this, config);
		const self = this;

		self.config = config;
		self.database = RED.nodes.getNode(config.database) as DatabaseNodeType | null;

		if (!self.database) return self.error("Database not configured!");

		try {
			const firebase = new FirebaseIn(self);

			firebase.registerNode();
			firebase.setNodeStatus();
			firebase.doSubscriptionQuery();

			self.on("close", (removed: boolean, done: () => void) => {
				firebase.doUnSubscriptionQuery();
				firebase.deregisterNode(removed, done);
			});
		} catch (error) {
			self.error(error);
		}
	}

	RED.nodes.registerType("firebase-in", FirebaseInNode);
};
