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
