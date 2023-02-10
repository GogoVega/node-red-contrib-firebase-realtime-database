/**
 * Copyright 2022-2023 Gauthier Dandele
 *
 * Licensed under the MIT License,
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://opensource.org/licenses/MIT.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { NodeAPI } from "node-red";
import FirebaseDatabase from "../lib/databaseNode";
import DatabaseConfigType from "../lib/types/DatabaseConfigType";
import { DatabaseNodeType } from "../lib/types/DatabaseNodeType";

module.exports = function (RED: NodeAPI) {
	function DatabaseNode(this: DatabaseNodeType, config: DatabaseConfigType) {
		RED.nodes.createNode(this, config);
		const self = this;

		self.connectionStatus = 0;
		self.config = config;
		self.nodes = [];
		self.RED = RED;

		const database = new FirebaseDatabase(self);

		database.logIn().catch((error: Error) => database.onError(error));

		self.on("close", (done: (error?: Error) => void) =>
			database
				.logOut()
				.then(() => done())
				.catch((error: Error) => done(error))
		);
	}

	RED.nodes.registerType("database-config", DatabaseNode, {
		credentials: {
			apiKey: { type: "text" },
			clientEmail: { type: "password" },
			email: { type: "text" },
			json: { type: "password" },
			password: { type: "password" },
			privateKey: { type: "password" },
			secret: { type: "password" },
			url: { type: "text" },
		},
	});
};
