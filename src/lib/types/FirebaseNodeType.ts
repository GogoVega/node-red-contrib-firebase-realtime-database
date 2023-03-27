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

import * as database from "firebase/database";
import * as adminDatabase from "firebase-admin/database";
import { Node, NodeMessage, NodeMessageInFlow } from "node-red";
import { DatabaseNodeType } from "./DatabaseNodeType";
import { FirebaseGetConfigType, FirebaseInConfigType, FirebaseOutConfigType } from "./FirebaseConfigType";

export enum QueryConstraint {
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

/* eslint-disable no-mixed-spaces-and-tabs */
export type QueryConstraintType =
	| Record<"orderByKey" | "orderByPriority" | "orderByValue", null | undefined>
	| Record<"limitToFirst" | "limitToLast", number>
	| Record<"orderByChild", string>
	| Record<
			"endAt" | "endBefore" | "equalTo" | "startAfter" | "startAt",
			{
				key?: string;
				value: number | string | boolean | null;
			}
	  >;

export type DataSnapshot = database.DataSnapshot | adminDatabase.DataSnapshot;
export type DBRef = adminDatabase.Reference | adminDatabase.Query;

export interface InputMessageType extends NodeMessageInFlow {
	method?: unknown;
	priority?: unknown;
}

export interface OutputMessageType extends NodeMessage {
	previousChildName?: string;
	priority: string | number | null;
}

interface FirebaseNode extends Node {
	database: DatabaseNodeType | null;

	/**
	 * A custom method on error to set node status as `Error` or `Permission Denied`.
	 * @param error The error received
	 * @param done If defined, a function to be called when all the work is complete and return the error message.
	 */
	onError: (error: unknown, done?: () => void) => void;
}

export interface FirebaseGetNodeType extends FirebaseNode {
	config: FirebaseGetConfigType;
}

export interface FirebaseInNodeType extends FirebaseNode {
	config: FirebaseInConfigType;
}

export interface FirebaseOutNodeType extends FirebaseNode {
	config: FirebaseOutConfigType;
}

export type FirebaseNodeType = FirebaseInNodeType | FirebaseGetNodeType | FirebaseOutNodeType;
