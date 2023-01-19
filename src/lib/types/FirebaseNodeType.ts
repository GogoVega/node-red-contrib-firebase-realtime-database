import { Node, NodeMessageInFlow } from "node-red";
import { DatabaseNodeType } from "./DatabaseNodeType";
import { NodeDef } from "node-red";

export type InMessageType = NodeMessageInFlow & { method: unknown };
export type OutMessageType = NodeMessageInFlow & { previousChildName: string };

export enum Query {
	"set",
	"push",
	"update",
	"remove",
}

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

export type QueryConstraintType =
	| Record<"orderByKey" | "orderByPriority" | "orderByValue", undefined>
	| Record<"limitToFirst" | "limitToLast", number>
	| Record<"orderByChild", string>
	| Record<
			"endAt" | "endBefore" | "equalTo" | "startAfter" | "startAt",
			{
				key?: string;
				value: number | string | boolean | null;
			}
	  >;

export enum Listener {
	value = "onValue",
	child_added = "onChildAdded",
	child_changed = "onChildChanged",
	child_moved = "onChildMoved",
	child_removed = "onChildRemoved",
}

export type Listeners = keyof typeof Listener;

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
	listenerType?: Listeners;
	outputType?: OutputType;
	path?: string;
};

export type FirebaseOutConfigType = NodeDef & {
	database: string;
	outputType?: OutputType;
	path?: string;
	pathType?: PathType;
	queryType?: QueryType;
};

type FirebaseNode = Node & {
	database: DatabaseNodeType | null;
};

export type FirebaseGetNodeType = FirebaseNode & {
	config: FirebaseGetConfigType;
};

export type FirebaseInNodeType = FirebaseNode & {
	config: FirebaseInConfigType;
	subscribed: boolean;
};

export type FirebaseOutNodeType = FirebaseNode & {
	config: FirebaseOutConfigType;
};

export type FirebaseNodeType = FirebaseInNodeType | FirebaseGetNodeType | FirebaseOutNodeType;
