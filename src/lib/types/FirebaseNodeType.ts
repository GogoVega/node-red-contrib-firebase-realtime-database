import admin from "firebase-admin";
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

export type DBRef = admin.database.Reference | admin.database.Query;

export interface InputMessageType extends NodeMessageInFlow {
	method?: unknown;
}

export interface OutputMessageType extends NodeMessage {
	previousChildName?: string;
}

interface FirebaseNode extends Node {
	database: DatabaseNodeType | null;
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
