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

import { Listener, QueryMethod } from "@gogovega/firebase-config-node/rtdb";
import { NodeDef } from "node-red";
import { IncomingMessage } from "./firebase-node";

export type UID = string;

export type ListenerType = Listener | "none";

export type OutputType = "auto" | "json" | "string";

export type Path = string;
export type PathType = "env" | "flow" | "global" | "jsonata" | "msg" | "str";

export type ChildField = string;
export type ChildFieldType = "env" | "flow" | "global" | "jsonata" | "msg" | "str";

export type ValueField = string;
export type ValueFieldType = "env" | "bool" | "date" | "flow" | "global" | "jsonata" | "msg" | "null" | "num" | "str";

export type LimitField = string;
export type LimitFieldType = "env" | "flow" | "global" | "jsonata" | "msg" | "num";

export interface QueryConstraintPropertySignature {
	child: { args: [child: ChildField, type: ChildFieldType, msg?: IncomingMessage]; promise: string };
	value: {
		args: [value: ValueField, type: ValueFieldType, msg?: IncomingMessage];
		promise: boolean | null | number | string;
	};
	limit: { args: [limit: LimitField, type: LimitFieldType, msg?: IncomingMessage]; promise: number };
}

export interface Limit {
	value: LimitField;
	type: LimitFieldType;
}

export interface OrderByChild {
	value: ChildField;
	type: ChildFieldType;
}

export interface RangeQuery {
	key: ChildField;
	value: ValueField;
	/**
	 * @deprecated Replaced by {@link types}
	 */
	type: ValueFieldType;
	types: RangeQueryTypes;
}

export interface RangeQueryTypes {
	value: ValueFieldType;
	child: ChildFieldType;
}

// TODO: Remove extra types
export interface QueryConstraint {
	orderByKey?: null;
	orderByPriority?: null;
	orderByValue?: null;
	limitToFirst?: Limit | number;
	limitToLast?: Limit | number;
	orderByChild?: OrderByChild | string;
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
	/**
	 * @deprecated Replaced by `constraints`
	 */
	constraint?: QueryConstraint;
	constraints?: QueryConstraint;
	outputType?: OutputType;
	passThrough?: boolean;
	useConstraints?: boolean;
};

export type FirebaseInConfig = BaseConfig & {
	/**
	 * @deprecated Replaced by `constraints`
	 */
	constraint?: QueryConstraint;
	constraints?: QueryConstraint;
	inputs?: 0 | 1;
	listenerType?: ListenerType;
	outputType?: OutputType;
	passThrough?: boolean;
	useConstraints?: boolean;
};

export type FirebaseOutConfig = BaseConfig & {
	priority?: number;
	queryType?: QueryMethod | "none";
};

export type FirebaseConfig = FirebaseGetConfig | FirebaseInConfig | FirebaseOutConfig;
