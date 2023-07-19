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
import { FirebaseIn } from "../lib/firebaseNode";
import { FirebaseInConfigType } from "../lib/types/FirebaseConfigType";
import { FirebaseInNodeType } from "../lib/types/FirebaseNodeType";

module.exports = function (RED: NodeAPI) {
	function FirebaseInNode(this: FirebaseInNodeType, config: FirebaseInConfigType) {
		RED.nodes.createNode(this, config);
		const self = this;

		try {
			const firebase = new FirebaseIn(self, config, RED);

			firebase.getDatabase();
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
