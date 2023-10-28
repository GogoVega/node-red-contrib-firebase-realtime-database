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

import { Node, NodeMessage, NodeMessageInFlow } from "node-red";
import { ConfigNode } from "@gogovega/firebase-config-node/types";
import { Constraint, QueryMethod } from "@gogovega/firebase-config-node/rtdb";
import { FirebaseGetConfig, FirebaseInConfig, FirebaseOutConfig } from "./firebase-config";

export enum QueryConstraintMap {
	"endAt",
	"endBefore",
	"equalTo",
	"limitToFirst",
	"limitToLast",
	"orderByChild",
	"orderByKey",
	"orderByPriority",
	"orderByValue",
	"startAfter",
	"startAt",
}

type Priority = number | string;

export interface IncomingMessage extends NodeMessageInFlow {
	constraints?: Constraint;
	method?: "none" | QueryMethod;
	priority?: Priority;
}

export interface OutgoingMessage extends NodeMessage {
	previousChildName?: string | null;
	priority: string | number | null;
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
