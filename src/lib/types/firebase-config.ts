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
import { ListenerMap, QueryMethodMap } from "@gogovega/firebase-config-node/rtdb";

export type ListenerType = keyof typeof ListenerMap;
export type PathType = "msg" | "str";
export type OutputType = "auto" | "string";
export type QueryType = "none" | keyof typeof QueryMethodMap;

export type ValueFieldType = number | string | boolean | null;
export type ChildFieldType = "bool" | "date" | "flow" | "global" | "msg" | "null" | "num" | "str";

interface RangeQueryType {
	key?: string;
	value: ValueFieldType;
	type: ChildFieldType;
}

export interface QueryConstraint {
	orderByKey?: null;
	orderByPriority?: null;
	orderByValue?: null;
	limitToFirst?: number;
	limitToLast?: number;
	orderByChild?: string;
	endAt?: RangeQueryType;
	endBefore?: RangeQueryType;
	equalTo?: RangeQueryType;
	startAfter?: RangeQueryType;
	startAt?: RangeQueryType;
}

type BaseConfig = NodeDef & {
	database: string;
};

export type FirebaseGetConfig = BaseConfig & {
	constraint?: QueryConstraint;
	outputType?: OutputType;
	passThrough?: boolean;
	path?: string;
	pathType?: PathType;
};

export type FirebaseInConfig = BaseConfig & {
	constraint?: QueryConstraint;
	listenerType?: ListenerType;
	outputType?: OutputType;
	path?: string;
};

export type FirebaseOutConfig = BaseConfig & {
	path?: string;
	pathType?: PathType;
	priority?: number;
	queryType?: QueryType;
};

export type FirebaseConfig = FirebaseGetConfig | FirebaseInConfig | FirebaseOutConfig;
