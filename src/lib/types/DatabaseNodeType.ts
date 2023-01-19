import { FirebaseApp } from "firebase/app";
import { Auth } from "firebase/auth";
import { Database } from "firebase/database";
import admin from "firebase-admin";
import { App } from "firebase-admin/app";
import { Node } from "node-red";
import DatabaseConfigType from "./DatabaseConfigType";

type DatabaseCredentials = {
	apiKey: string;
	email: string;
	json: string;
	password: string;
	url: string;
	secret: string;
};

type SubscriptionsType = {
	value: Record<string, number>;
	child_added: Record<string, number>;
	child_changed: Record<string, number>;
	child_moved: Record<string, number>;
	child_removed: Record<string, number>;
};

type DatabaseNodeType = Node & {
	app?: FirebaseApp | App;
	auth?: Auth | admin.auth.Auth;
	connected: boolean;
	config: DatabaseConfigType;
	credentials: DatabaseCredentials;
	database?: Database | admin.database.Database;
	nodes: Array<Node>;
	subscribedListeners: SubscriptionsType;
};

type JSONContentType = {
	project_id?: string;
	client_email?: string;
	private_key?: string;
};

export { DatabaseNodeType, JSONContentType };
