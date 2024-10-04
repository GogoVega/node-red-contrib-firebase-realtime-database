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

import { Constraint, Listener, Priority, QueryMethod } from "@gogovega/firebase-config-node/rtdb";
import { ConfigNode } from "@gogovega/firebase-config-node/types";
import { Node, NodeMessageInFlow } from "node-red";
import { FirebaseGetConfig, FirebaseInConfig, FirebaseOutConfig } from "./firebase-config";

export interface IncomingMessage extends NodeMessageInFlow {
	constraints?: Constraint;
	listener?: Listener;
	method?: QueryMethod;
	priority?: Priority;
}

export interface OutgoingMessage {
	payload: unknown;
	previousChildName?: string | null;
	priority: string | number | null;
	topic: string | null;
	_msgid?: string | undefined;
}

export interface FirebaseBaseNode extends Node {
	database: ConfigNode | null;
}

export interface FirebaseGetNode extends FirebaseBaseNode {
	config: FirebaseGetConfig;
}

export interface FirebaseInNode extends FirebaseBaseNode {
	config: FirebaseInConfig;
}

export interface FirebaseOutNode extends FirebaseBaseNode {
	config: FirebaseOutConfig;
}

export type FirebaseNode = FirebaseInNode | FirebaseGetNode | FirebaseOutNode;

export type NodeConfig<TNode extends FirebaseNode> = TNode["config"];
