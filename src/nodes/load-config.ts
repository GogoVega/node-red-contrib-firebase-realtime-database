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

/**
 * This fake node is used as:
 * An endpoint for nodes to request services from
 *   - Returns options to autocomplete the path field
 *   - Informs the editor about the config-node status
 *   - Run a command to update NR dependencies
 *
 * Hosted services such as FlowFuse do not use a file system - so it's not possible to run the Migrate script
 * from the runtime.
 */
module.exports = function (RED: NodeAPI) {
	// Get autocomplete options
	RED.httpAdmin.get(
		"/firebase/rtdb/autocomplete/:id?",
		RED.auth.needsPermission("load-config.write"),
		async (req, res) => {
			const id = req.params.id as string | undefined;
			const path = req.query.path as string | undefined;

			if (!id) {
				res.status(400).send("The config-node ID is missing!");
				return;
			}

			const node = RED.nodes.getNode(id) as ConfigNode | null;

			// Like database field not setted or new config-node not yet deployed
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
				res.status(500).send({ message: String(error) });
			}
		}
	);
};
