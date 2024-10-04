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

import { NodeMessage } from "node-red";
import { FirebaseBaseNode } from "./firebase-node";
import { OnDisconnectConfig } from "./ondisconnect-config";

export type SendMsgEvent = "connected" | "disconnect";

export interface OnDisconnectMessage extends NodeMessage {
	payload: number;
	event: SendMsgEvent;
	topic: string;
}

export interface OnDisconnectNode extends FirebaseBaseNode {
	config: OnDisconnectConfig;
}
