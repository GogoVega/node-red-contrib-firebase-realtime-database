import { NodeAPI } from "node-red";
import { FirebaseOut } from "../lib/firebaseNode";
import { DatabaseNodeType } from "../lib/types/DatabaseNodeType";
import { FirebaseOutConfigType, FirebaseOutNodeType, InputMessageType } from "../lib/types/FirebaseNodeType";

module.exports = function (RED: NodeAPI) {
	function FirebaseOutNode(this: FirebaseOutNodeType, config: FirebaseOutConfigType) {
		RED.nodes.createNode(this, config);
		const self = this;

		self.config = config;
		self.database = RED.nodes.getNode(config.database) as DatabaseNodeType | null;

		if (!self.database) {
			self.error("Database not configured!");
			return;
		}

		self.database.nodes.push(self);

		const firebase = new FirebaseOut(self);

		firebase.setNodeStatus();

		self.on("input", (msg, _send, done) => {
			firebase
				.doWriteQuery(msg as InputMessageType)
				.then(() => done())
				.catch((error) => done(error));
		});

		self.on("close", () => firebase.removeNodeStatus());
	}

	RED.nodes.registerType("firebase-out", FirebaseOutNode);
};
