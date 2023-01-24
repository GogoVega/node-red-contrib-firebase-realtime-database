import { NodeAPI } from "node-red";
import { FirebaseGet } from "../lib/firebaseNode";
import { DatabaseNodeType } from "../lib/types/DatabaseNodeType";
import { FirebaseGetConfigType } from "../lib/types/FirebaseConfigType";
import { FirebaseGetNodeType, InputMessageType } from "../lib/types/FirebaseNodeType";

module.exports = function (RED: NodeAPI) {
	function FirebaseGetNode(this: FirebaseGetNodeType, config: FirebaseGetConfigType) {
		RED.nodes.createNode(this, config);
		const self = this;

		self.config = config;
		self.database = RED.nodes.getNode(config.database) as DatabaseNodeType | null;

		if (!self.database) return self.error("Database not configured!");

		const firebase = new FirebaseGet(self);

		firebase.registerNode();
		firebase.setNodeStatus();

		self.on("input", (msg: InputMessageType, _send, done) => {
			firebase
				.doGetQuery(msg)
				.then(() => done())
				.catch((error) => self.onError(error, done));
		});

		self.on("close", (removed: boolean, done: () => void) => firebase.deregisterNode(removed, done));
	}

	RED.nodes.registerType("firebase-get", FirebaseGetNode);
};
