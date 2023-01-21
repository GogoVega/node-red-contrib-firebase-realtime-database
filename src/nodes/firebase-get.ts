import { NodeAPI } from "node-red";
import { FirebaseGet } from "../lib/firebaseNode";
import { DatabaseNodeType } from "../lib/types/DatabaseNodeType";
import { FirebaseGetConfigType, FirebaseGetNodeType, InputMessageType } from "../lib/types/FirebaseNodeType";

module.exports = function (RED: NodeAPI) {
	function FirebaseGetNode(this: FirebaseGetNodeType, config: FirebaseGetConfigType) {
		RED.nodes.createNode(this, config);
		const self = this;

		self.config = config;
		self.database = RED.nodes.getNode(config.database) as DatabaseNodeType | null;

		if (!self.database) {
			self.error("Database not configured!");
			return;
		}

		self.database.nodes.push(self);

		const firebase = new FirebaseGet(self);

		firebase.setNodeStatus();

		self.on("input", (msg: InputMessageType, _send, done) => {
			firebase
				.doGetQuery(msg)
				.then(() => done())
				.catch((error) => done(error));
		});

		self.on("close", () => firebase.removeNodeStatus());
	}

	RED.nodes.registerType("firebase-get", FirebaseGetNode);
};
