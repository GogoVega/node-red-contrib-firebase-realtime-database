import { NodeAPI } from 'node-red';
import { defaultListeners } from "./const/firebaseNode";
import FirebaseDatabase from "./lib/databaseNode";
import DatabaseConfigType from "./lib/types/DatabaseConfigType";
import { DatabaseNodeType } from './lib/types/DatabaseNodeType';

module.exports = function (RED: NodeAPI) {
	function DatabaseNode(this: DatabaseNodeType, config: DatabaseConfigType) {
		const self = this;

		self.connected = false;
		self.config = config;
		self.subscribedListeners = defaultListeners;
		self.nodes = [];

		RED.nodes.createNode(this, config);

		const database = new FirebaseDatabase(self);
		database.logIn()
			.catch((error: Error) => {
				database.setNodesDisconnected();
				self.error(database.parseErrorMsg(error));
			});

		self.on("close", (done: (error?: Error) => void) =>
			database.logOut()
				.then(() => done())
				.catch((error: Error) => done(error))
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
