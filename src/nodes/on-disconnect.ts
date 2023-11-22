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
import { OnDisconnect } from "../lib/ondisconnect-node";
import { IncomingMessage, OnDisconnectConfig, OnDisconnectNode } from "../lib/types";

module.exports = function (RED: NodeAPI) {
	function OnDisconnectNode(this: OnDisconnectNode, config: OnDisconnectConfig) {
		RED.nodes.createNode(this, config);

		const firebase = new OnDisconnect(this, config, RED);

		firebase.attachStatusListener();
		firebase.setMsgSendHandler();

		this.on("input", (msg: IncomingMessage, _send, done) => firebase.mofifyOnDisconnect(msg, done));

		this.on("close", (done: () => void) => firebase.detachStatusListener(done));
	}

	RED.nodes.registerType("on-disconnect", OnDisconnectNode);
};
