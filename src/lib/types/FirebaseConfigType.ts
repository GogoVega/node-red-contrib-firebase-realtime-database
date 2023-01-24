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
	queryType?: QueryType;
};
