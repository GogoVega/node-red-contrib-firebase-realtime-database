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
import { FirebaseIn } from "../lib/firebase-node";
import { FirebaseInConfig, FirebaseInNode } from "../lib/types";

module.exports = function (RED: NodeAPI) {
	function FirebaseInNode(this: FirebaseInNode, config: FirebaseInConfig) {
		RED.nodes.createNode(this, config);

		const firebase = new FirebaseIn(this, config, RED);

		firebase.attachStatusListener();
		firebase.subscribe();

		this.on("input", (msg, send, done) => firebase.subscribe(msg, send, done));

		this.on("close", (removed: boolean, done: () => void) => {
			firebase.unsubscribe();
			firebase.detachStatusListener(removed, done);
		});
	}

	RED.nodes.registerType("firebase-in", FirebaseInNode);
};
