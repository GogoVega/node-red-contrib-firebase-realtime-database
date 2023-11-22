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

import { ConfigNode } from "@gogovega/firebase-config-node/types";
import { NodeAPI } from "node-red";
import { researchConfigNodeExistence } from "../utils/check-config-node";

/**
 * This fake node is used:
 * 1. To check the existence of the config-node See {@link researchConfigNodeExistence}
 * 2. An endpoint for nodes to request services from - returns options to autcomplete the path field
 */
module.exports = function (RED: NodeAPI) {
	researchConfigNodeExistence(RED);

	RED.httpAdmin.get(
		"/firebase/rtdb/autocomplete/:id?",
		RED.auth.needsPermission("load-config.read"),
		async (req, res) => {
			const id = req.params.id as string | undefined;
			const path = req.query.path as string | undefined;

			if (!id) return res.status(400).send("The config-node ID is missing!");

			const node = RED.nodes.getNode(id) as ConfigNode | null;

			// Like database field not setted or new config-node not yet deployed
			if (!node) return res.json([]);

			const snapshot = await node.rtdb?.get(path);
			const data = snapshot ? snapshot.val() : {};
			const options = typeof data === "object" ? Object.keys(data ?? {}) : [];

			return res.json(options);
		}
	);
};
