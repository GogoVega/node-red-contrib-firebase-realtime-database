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

import { Listener, QueryMethod } from "@gogovega/firebase-config-node/rtdb";
import { NodeDef } from "node-red";

export type UID = string;

export type ListenerType = Listener | "none";

export type Path = string;
export type PathType = "msg" | "str";

export type OutputType = "auto" | "string";

export type ChildField = "bool" | "date" | "flow" | "global" | "msg" | "null" | "num" | "str";
export type ValueField = number | string | boolean | null;

export interface RangeQuery {
	key?: string;
	value: ValueField;
	type: ChildField;
}

export interface QueryConstraint {
	orderByKey?: null;
	orderByPriority?: null;
	orderByValue?: null;
	limitToFirst?: number;
	limitToLast?: number;
	orderByChild?: string;
	endAt?: RangeQuery;
	endBefore?: RangeQuery;
	equalTo?: RangeQuery;
	startAfter?: RangeQuery;
	startAt?: RangeQuery;
}

export type BaseConfig = NodeDef & {
	database: UID;
	path?: Path;
	pathType?: PathType;
};

export type FirebaseGetConfig = BaseConfig & {
	constraint?: QueryConstraint;
	outputType?: OutputType;
	passThrough?: boolean;
};

export type FirebaseInConfig = BaseConfig & {
	constraint?: QueryConstraint;
	listenerType?: ListenerType;
	outputType?: OutputType;
	passThrough?: boolean;
};

export type FirebaseOutConfig = BaseConfig & {
	priority?: number;
	queryType?: QueryMethod | "none";
};

export type FirebaseConfig = FirebaseGetConfig | FirebaseInConfig | FirebaseOutConfig;
