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

import { Database, DataSnapshot, get, off, ref, query } from "firebase/database";
import * as firebase from "firebase/database";
import admin from "firebase-admin";
import { ConnectionStatus } from "./types/DatabaseNodeType";
import { Listener, ListenerType, Query } from "../lib/types/FirebaseConfigType";
import {
	DBRef,
	FirebaseGetNodeType,
	FirebaseInNodeType,
	FirebaseNodeType,
	FirebaseOutNodeType,
	InputMessageType,
	OutputMessageType,
	QueryConstraint,
	QueryConstraintType,
} from "./types/FirebaseNodeType";
import { Entry } from "./types/UtilType";
import { printEnumKeys } from "./utils";

class Firebase {
	constructor(protected node: FirebaseNodeType) {
		node.onError = (error: unknown, done?: (error?: unknown) => void) => {
			const msg = error instanceof Error ? error.message : (error as object | string).toString();

			if (msg.match(/(permission_denied|Permission denied)/gm)) {
				this.permissionDeniedStatus = true;
				this.setNodeStatus("Permission Denied");
			} else {
				this.setNodeStatus("Error", 5000);
			}

			if (done) return done(error);

			this.node.error(msg);
		};
	}

	protected get db() {
		return this.node.database?.database;
	}

	private permissionDeniedStatus = false;

	protected checkPath(path?: unknown, empty?: boolean) {
		if (empty && path === undefined) return;
		if (!empty && path === undefined) throw new Error("The msg containing the PATH do not exist!");
		if (!empty && !path) throw new Error("PATH must be non-empty string!");
		if (typeof path !== "string") throw new Error("PATH must be a string!");
		if (path?.match(/[.#$\[\]]/g)) throw new Error(`PATH must not contain ".", "#", "$", "[", or "]"`);
		return path;
	}

	public deregisterNode(removed: boolean, done: (error?: unknown) => void) {
		const nodes = this.node.database?.nodes;

		if (!nodes) return done();

		try {
			nodes.forEach((node) => {
				if (node.id !== this.node.id) return;
				nodes.splice(nodes.indexOf(node), 1);
			});

			this.node.database?.destroyUnusedConnection(removed);

			done();
		} catch (error) {
			done(error);
		}
	}

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	protected isAdmin(db: Database | admin.database.Database): db is admin.database.Database {
		return this.node.database?.config.authType === "privateKey";
	}

	public registerNode() {
		// TODO: Limit properties (Omit)
		this.node.database?.nodes.push(this.node);
		this.node.database?.restoreDestroyedConnection();
	}

	protected sendMsg(snapshot: DataSnapshot | admin.database.DataSnapshot, child?: string | null) {
		// Clear Permission Denied Status
		if (this.permissionDeniedStatus) {
			this.permissionDeniedStatus = false;
			this.setNodeStatus();
		}

		try {
			if (!snapshot.exists()) return;

			const topic = snapshot.ref.key?.toString() || "";
			const payload = this.node.config.outputType === "string" ? JSON.stringify(snapshot.val()) : snapshot.val();
			const previousChildName = child !== undefined ? { previousChildName: child || "" } : {};

			this.node.send({ payload: payload, ...previousChildName, topic: topic } as OutputMessageType);
		} catch (error) {
			this.node.onError(error);
		}
	}

	public setNodeStatus(msg?: string, time?: number) {
		if (!this.node.database) return;

		// Corresponds to do a Clear Status
		if (msg && time) setTimeout(() => this.setNodeStatus(), time);

		if (msg) return this.node.status({ fill: "red", shape: "dot", text: msg });

		switch (this.node.database.connectionStatus) {
			case ConnectionStatus.DISCONNECTED:
				this.node.status({ fill: "red", shape: "dot", text: "Disconnected" });
				break;
			case ConnectionStatus.CONNECTING:
				this.node.status({ fill: "yellow", shape: "ring", text: "Connecting" });
				break;
			case ConnectionStatus.CONNECTED:
				this.node.status({ fill: "green", shape: "dot", text: "Connected" });
				break;
			case ConnectionStatus.NO_NETWORK:
				this.node.status({ fill: "red", shape: "ring", text: "No Network" });
				break;
			case ConnectionStatus.ERROR:
				this.node.status({ fill: "red", shape: "dot", text: "Error" });
				break;
		}
	}
}

export class FirebaseGet extends Firebase {
	constructor(protected node: FirebaseGetNodeType) {
		super(node);
	}

	private applyQueryConstraints(dbRef: DBRef, method: unknown) {
		const constraints = this.checkQueryConstraint(method);

		for (const [method, value] of Object.entries(constraints) as Entry<QueryConstraintType | Record<string, never>>[]) {
			switch (method) {
				case "endAt":
				case "endBefore":
				case "equalTo":
				case "startAfter":
				case "startAt":
					dbRef = dbRef[method](value.value, value.key);
					break;
				case "limitToFirst":
				case "limitToLast":
					dbRef = dbRef[method](value);
					break;
				case "orderByChild":
					dbRef = dbRef[method](value);
					break;
				case "orderByKey":
				case "orderByPriority":
				case "orderByValue":
					dbRef = dbRef[method]();
					break;
			}
		}

		return dbRef;
	}

	private checkQueryConstraint(constraints: unknown): QueryConstraintType | Record<string, never> {
		if (constraints === undefined || constraints === null) return {};
		if (typeof constraints !== "object") throw new Error("Query Constraint must be an Object!");

		for (const [method, value] of Object.entries(constraints)) {
			switch (method) {
				case "endAt":
				case "endBefore":
				case "equalTo":
				case "startAfter":
				case "startAt":
					if (typeof value !== "object") throw new Error(`The value of the "${method}" constraint must be an object!`);
					if (value.value === undefined)
						throw new Error(`The value of the "${method}" constraint must be an object containing 'value' as key.`);
					if (typeof value.value !== "string" && typeof value.value !== "boolean" && typeof value.value !== "number")
						throw new Error(`The value of the "${method}.value" constraint must be a boolean or number or string!`);

					if (value.key && typeof value.key !== "string")
						throw new Error(`The value of the "${method}.key" constraint must be a string!`);
					break;
				case "limitToFirst":
				case "limitToLast":
					if (typeof value !== "number") throw new Error(`The value of the "${method}" constraint must be a number!`);
					break;
				case "orderByChild":
					if (typeof value !== "string") throw new Error(`The value of the "${method}" constraint must be a string!`);
					break;
				case "orderByKey":
				case "orderByPriority":
				case "orderByValue":
					if (value !== undefined && value !== null)
						throw new Error(`The value of the "${method}" constraint must be null or undefined!`);
					break;
				default:
					throw new Error(
						`Query constraint received: '${method}' but must be one of ${printEnumKeys(QueryConstraint)}.`
					);
			}
		}

		return constraints as QueryConstraintType;
	}

	public async doGetQuery(msg: InputMessageType) {
		const path = this.getPath(msg);
		let snapshot;

		if (!this.db) return;

		if (this.isAdmin(this.db)) {
			const database = path ? this.db.ref().child(path) : this.db.ref();

			snapshot = await this.applyQueryConstraints(database, msg.method).get();
		} else {
			snapshot = await get(query(ref(this.db, path), ...this.getQueryConstraints(msg.method)));
		}

		this.sendMsg(snapshot);
	}

	private getPath(msg: InputMessageType) {
		let path;

		switch (this.node.config.pathType) {
			case "msg":
				path = msg[this.node.config.path as keyof typeof msg];
				break;
			case "str":
				path = this.node.config.path;
				break;
			default:
				throw new Error("pathType should be 'msg' or 'str', please re-configure this node.");
		}

		return this.checkPath(path || undefined, true);
	}

	private getQueryConstraints(method: unknown) {
		const constraints = this.checkQueryConstraint(method) || {};
		const query = [];

		for (const [method, value] of Object.entries(constraints) as Entry<QueryConstraintType | Record<string, never>>[]) {
			switch (method) {
				case "endAt":
				case "endBefore":
				case "equalTo":
				case "startAfter":
				case "startAt":
					query.push(firebase[method](value.value, value.key));
					break;
				case "limitToFirst":
				case "limitToLast":
					query.push(firebase[method](value));
					break;
				case "orderByChild":
					query.push(firebase[method](value));
					break;
				case "orderByKey":
				case "orderByPriority":
				case "orderByValue":
					query.push(firebase[method]());
					break;
			}
		}

		return query;
	}
}

export class FirebaseIn extends Firebase {
	constructor(protected node: FirebaseInNodeType) {
		super(node);
	}

	private listener = this.getListener();
	private path = this.node.config.path?.toString() || undefined;

	public doSubscriptionQuery() {
		const pathParsed = this.checkPath(this.path, true);

		if (!this.db) return;

		if (this.isAdmin(this.db)) {
			const databaseRef = pathParsed ? this.db.ref().child(pathParsed) : this.db.ref();

			databaseRef.on(
				this.listener,
				(snapshot, child) => this.sendMsg(snapshot, child),
				(error) => this.node.onError(error)
			);
		} else {
			firebase[Listener[this.listener]](
				firebase.ref(this.db, pathParsed),
				(snapshot: DataSnapshot, child: string | null | undefined) => this.sendMsg(snapshot, child),
				(error) => this.node.onError(error)
			);
		}
	}

	public doUnSubscriptionQuery() {
		const listeners = this.node.database?.nodes.filter((node) => {
			if (node.type === "firebase-in") return (node as FirebaseInNodeType).config.listenerType === this.listener;

			return false;
		});

		// Do not remove the listener if it's still in use
		if (listeners && listeners.length > 1) return;

		if (!this.db) return;

		if (this.isAdmin(this.db)) {
			const databaseRef = this.path ? this.db.ref().child(this.path) : this.db.ref();

			databaseRef.off(this.listener);
		} else {
			off(ref(this.db, this.path), this.listener);
		}
	}

	private getListener() {
		const listener = this.node.config.listenerType || "value";

		if (listener in Listener) return listener as ListenerType;

		throw new Error(`msg.method must be one of ${printEnumKeys(Listener)}.`);
	}
}

// TODO: Add others methods
export class FirebaseOut extends Firebase {
	constructor(protected node: FirebaseOutNodeType) {
		super(node);
	}

	public doWriteQuery(msg: InputMessageType) {
		const path = this.getPath(msg);
		const query = this.getQuery(msg);

		if (!this.db) return Promise.resolve();

		if (this.isAdmin(this.db)) {
			return this.db.ref().child(path)[query](msg.payload);
		} else {
			if (query === "update") {
				if (msg.payload && typeof msg.payload === "object") return firebase[query](ref(this.db, path), msg.payload);
				throw new Error("msg.payload must be an object with 'update' query.");
			} else {
				return firebase[query](ref(this.db, path), msg.payload);
			}
		}
	}

	private getPath(msg: InputMessageType) {
		let path;

		switch (this.node.config.pathType) {
			case "msg":
				path = msg[this.node.config.path as keyof typeof msg];
				break;
			case "str":
				path = this.node.config.path;
				break;
			default:
				throw new Error("pathType should be 'msg' or 'str', please re-configure this node.");
		}

		return this.checkPath(path, false) as string;
	}

	private getQuery(msg: InputMessageType) {
		const query = this.node.config.queryType === "none" ? msg.method : this.node.config.queryType;
		return this.checkQuery(query);
	}

	private checkQuery(method: unknown) {
		if (method === undefined) throw new Error("msg.method do not exist!");
		if (typeof method !== "string") throw new Error("msg.method must be a string!");
		const query = method.toLowerCase();
		if (query in Query) return query as keyof typeof Query;
		throw new Error(`msg.method must be one of ${printEnumKeys(Query)}.`);
	}
}
