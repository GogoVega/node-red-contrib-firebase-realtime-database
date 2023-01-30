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

import { NodeDef } from "node-red";

export enum Listener {
	value = "onValue",
	child_added = "onChildAdded",
	child_changed = "onChildChanged",
	child_moved = "onChildMoved",
	child_removed = "onChildRemoved",
}

export enum Query {
	"set",
	"push",
	"update",
	"remove",
	"setPriority",
	"setWithPriority",
}

export type ListenerType = keyof typeof Listener;
export type PathType = "msg" | "str";
export type OutputType = "auto" | "string";
export type QueryType = "none" | keyof typeof Query;

export type FirebaseGetConfigType = NodeDef & {
	database: string;
	outputType?: OutputType;
	path?: string;
	pathType?: PathType;
};

export type FirebaseInConfigType = NodeDef & {
	database: string;
	listenerType?: ListenerType;
	outputType?: OutputType;
	path?: string;
};

export type FirebaseOutConfigType = NodeDef & {
	database: string;
	outputType?: OutputType;
	path?: string;
	pathType?: PathType;
	priority?: number;
	queryType?: QueryType;
};
