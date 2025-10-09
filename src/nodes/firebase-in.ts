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
import { ConfigNode } from "@gogovega/firebase-config-node/types";
import { FirebaseIn } from "../lib/firebase-node";
import { FirebaseInConfig, FirebaseInNode } from "../lib/types";

module.exports = function (RED: NodeAPI) {
	// Get autocomplete options for all Firebase nodes
	RED.httpAdmin.get(
		"/firebase/rtdb/autocomplete/:id?",
		RED.auth.needsPermission("firebase-in.write"),
		async (req, res) => {
			const id = req.params.id as string | undefined;
			const path = req.query.path as string | undefined;

			if (!id) {
				res.status(400).send("The config-node ID is missing!");
				return;
			}

			const node = RED.nodes.getNode(id) as ConfigNode | null;

			// Like database field not set or new config-node not yet deployed
			if (!node) {
				res.json([]);
				return;
			}

			try {
				// May fail if permission is denied
				const snapshot = await node.rtdb?.get(decodeURI(path || ""));
				const data = snapshot ? snapshot.val() : {};
				const options = typeof data === "object" ? Object.keys(data ?? {}) : [];

				res.json(options);
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);

				if (/(permission_denied|Permission denied)/.test(msg)) {
					res.json([]);
					return;
				}

				res.status(500).send({ message: String(error) });
			}
		}
	);

	function FirebaseInNode(this: FirebaseInNode, config: FirebaseInConfig) {
		RED.nodes.createNode(this, config);

		const firebase = new FirebaseIn(this, config, RED);

		firebase.attachStatusListener();
		firebase.subscribe();

		this.on("input", (msg, send, done) => firebase.subscribe(msg, send, done));

		this.on("close", (done: () => void) => {
			firebase.unsubscribe();
			firebase.detachStatusListener(done);
		});
	}

	RED.nodes.registerType("firebase-in", FirebaseInNode);
};
