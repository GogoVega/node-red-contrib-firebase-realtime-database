import { NodeAPI } from "node-red";
import { FirebaseOut } from "../lib/firebaseNode";
import { DatabaseNodeType } from "../lib/types/DatabaseNodeType";
import { FirebaseOutConfigType } from "../lib/types/FirebaseConfigType";
import { FirebaseOutNodeType, InputMessageType } from "../lib/types/FirebaseNodeType";

module.exports = function (RED: NodeAPI) {
	function FirebaseOutNode(this: FirebaseOutNodeType, config: FirebaseOutConfigType) {
		RED.nodes.createNode(this, config);
		const self = this;

		self.config = config;
		self.database = RED.nodes.getNode(config.database) as DatabaseNodeType | null;

		if (!self.database) return self.error("Database not configured!");

		const firebase = new FirebaseOut(self);

		firebase.registerNode();
		firebase.setNodeStatus();

		self.on("input", (msg: InputMessageType, _send, done) => {
			firebase
				.doWriteQuery(msg)
				.then(() => done())
				.catch((error: Error) => self.onError(error, done));
		});

		self.on("close", (removed: boolean, done: () => void) => firebase.deregisterNode(removed, done));
	}

	RED.nodes.registerType("firebase-out", FirebaseOutNode);
};
