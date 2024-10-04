/**
 * Copyright 2022-2024 Gauthier Dandele
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
import { FirebaseOut } from "../lib/firebase-node";
import { FirebaseOutConfig, FirebaseOutNode, IncomingMessage } from "../lib/types";

module.exports = function (RED: NodeAPI) {
	function FirebaseOutNode(this: FirebaseOutNode, config: FirebaseOutConfig) {
		RED.nodes.createNode(this, config);

		const firebase = new FirebaseOut(this, config, RED);

		firebase.attachStatusListener();

		this.on("input", (msg: IncomingMessage, _send, done) => firebase.modify(msg, done));

		this.on("close", (done: () => void) => firebase.detachStatusListener(done));
	}

	RED.nodes.registerType("firebase-out", FirebaseOutNode);
};
