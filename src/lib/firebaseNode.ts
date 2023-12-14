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

import { Database, get, ref, query, Unsubscribe } from "@firebase/database";
import * as firebase from "@firebase/database";
import * as admin from "firebase-admin";
import { ServerValue } from "firebase-admin/database";
import { ConnectionStatus } from "./types/DatabaseNodeType";
import { Listener, ListenerType, Query } from "../lib/types/FirebaseConfigType";
import {
	ChildFieldType,
	DataSnapshot,
	DBRef,
	FirebaseGetNodeType,
	FirebaseInNodeType,
	FirebaseNodeType,
	FirebaseOutNodeType,
	InputMessageType,
	OutputMessageType,
	QueryConstraint,
	QueryConstraintType,
	ValueFieldType,
} from "./types/FirebaseNodeType";
import { Entry } from "./types/UtilType";
import { printEnumKeys } from "./utils";
import { deepCopy } from "@firebase/util";

/**
 * Firebase Class
 *
 * This class is used to communicate with Google Firebase Realtime Databases.
 *
 * The modules used are `firebase` and `firebase-admin`.
 *
 * This class and subclasses are used to communicate with Firebase Realtime Databases. It allows to add, modify and
 * fetch data from your databases aswell as subscribing to data at the paths you specify which yields a payload
 * whenever a value changes.
 *
 * This class contains the methods common to the three child classes:
 * - `FirebaseIn`
 * - `FirebaseOut`
 * - `FirebaseGet`
 *
 * @param node The node to associate with this class
 * @returns Firebase Class
 */
export class Firebase {
	/**
	 * This property contains the identifier of the timer used to define the error status of the node and will be used
	 * to clear the timeout.
	 */
	private errorTimeoutID: ReturnType<typeof setTimeout> | undefined;

	/**
	 * This property is used to store the "Permission Denied" state of the node.
	 * Error received when database rules deny reading/writing data.
	 */
	protected permissionDeniedStatus = false;

	/**
	 * This callback is used to subscribe and unsubscribe to the `signedIn` event.
	 */
	protected signedInCallback?: (isSignedIn: boolean) => void;

	constructor(protected node: FirebaseNodeType) {
		node.onError = this.onError.bind(this);

		if (!node.database) {
			node.error("Database not configured or disabled!");
			node.status({ fill: "red", shape: "ring", text: "Database not ready!" });
		}
	}

	/**
	 * Gets the Firebase Database instance from the `config-node`.
	 */
	protected get db() {
		return this.node.database?.database;
	}

	/**
	 * Applies the query constraints to the database reference.
	 * @param method The object containing the query constraints
	 * @returns An array of query constraints checked
	 */
	protected applyQueryConstraints(method: unknown): firebase.QueryConstraint[];

	/**
	 * Applies the query constraints to the database reference.
	 * @param method The object containing the query constraints
	 * @param dbRef The database reference
	 * @returns The database reference with the query constraints applied
	 */
	protected applyQueryConstraints(method: unknown, dbRef: DBRef): DBRef;

	protected applyQueryConstraints(method: unknown, dbRef?: DBRef) {
		const constraints = this.checkQueryConstraints(method);
		const query = [];

		for (const [method, value] of Object.entries(constraints) as Entry<QueryConstraintType>[]) {
			switch (method) {
				case "endAt":
				case "endBefore":
				case "equalTo":
				case "startAfter":
				case "startAt":
					if (dbRef) {
						dbRef = dbRef[method](value.value, value.key);
					} else {
						query.push(firebase[method](value.value, value.key));
					}
					break;
				case "limitToFirst":
				case "limitToLast":
					if (dbRef) {
						dbRef = dbRef[method](value);
					} else {
						query.push(firebase[method](value));
					}
					break;
				case "orderByChild":
					if (dbRef) {
						dbRef = dbRef[method](value);
					} else {
						query.push(firebase[method](value));
					}
					break;
				case "orderByKey":
				case "orderByPriority":
				case "orderByValue":
					if (dbRef) {
						dbRef = dbRef[method]();
					} else {
						query.push(firebase[method]());
					}
					break;
			}
		}

		return dbRef || query;
	}

	/**
	 * Checks path to match Firebase rules. Throws an error if does not match.
	 * @param path The path to check
	 * @param empty Can the path be empty? Default: `false`
	 * @returns The path checked to the database
	 */
	protected checkPath(path: unknown, empty: true): string | undefined;

	/**
	 * Checks path to match Firebase rules. Throws an error if does not match.
	 * @param path The path to check
	 * @param empty Can the path be empty? Default: `false`
	 * @returns The path checked to the database
	 */
	protected checkPath(path: unknown, empty?: false): string;

	protected checkPath(path: unknown, empty?: boolean) {
		if (empty && path === undefined) return;
		if (!empty && path === undefined) throw new Error("The msg containing the PATH do not exist!");
		if (!empty && !path) throw new Error("PATH must be non-empty string!");
		if (typeof path !== "string") throw new Error("PATH must be a string!");
		if (path?.match(/[.#$\[\]]/g)) throw new Error(`PATH must not contain ".", "#", "$", "[", or "]"`);
		return path.trim();
	}

	/**
	 * Checks the query constraints and throws an error if it is invalid.
	 * @param constraints The query constraints
	 * @returns The query constraints checked
	 */
	protected checkQueryConstraints(constraints: unknown): QueryConstraintType {
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
					if (
						typeof value.value !== "string" &&
						typeof value.value !== "boolean" &&
						typeof value.value !== "number" &&
						value.value !== null
					)
						throw new Error(`The value of the "${method}.value" constraint must be a boolean, number, string or null!`);

					if (value.key === null || (value.key && typeof value.key !== "string"))
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

		return constraints;
	}

	/**
	 * Deregisters node from the database.
	 *
	 * Removes the node from the array of nodes linked to this same database and call the `destroyUnusedConnection` method
	 * in order to destroy the connection with Firebase if the database is unused.
	 * @param removed A boolean indicating whether the node is being removed.
	 * @param done A function to be called when all the work is complete.
	 */
	public deregisterNode(removed: boolean, done: (error?: unknown) => void) {
		try {
			const nodes = this.node.database?.nodes;

			if (this.signedInCallback) this.node.RED.events.removeListener("Firebase:signedIn", this.signedInCallback);

			if (!nodes) return done();

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

	/**
	 * Evaluates the payload message to replace reserved keywords (`TIMESTAMP` and `INCREMENT`) with the corresponding server value.
	 * @param payload The payload to be evaluated
	 * @returns The payload evaluated
	 */
	protected evaluatePayloadForServerValue(payload: unknown): unknown {
		switch (typeof payload) {
			case "undefined":
			case "boolean":
			case "number":
				return payload;
			case "string": {
				if (/^\s*TIMESTAMP\s*$/.test(payload)) return ServerValue.TIMESTAMP;

				if (/^\s*INCREMENT\s*-?\d+\.?\d*\s*$/.test(payload)) {
					const deltaString = payload.match(/-?\d+\.?\d*/)?.[0] || "";
					const delta = Number(deltaString);

					if (Number.isNaN(delta) || !Number.isInteger(delta))
						throw new Error("The delta of increment function must be an integer.");

					return ServerValue.increment(delta);
				}

				return payload;
			}
			case "object": {
				if (payload === null) return payload;
				if (Array.isArray(payload)) return payload.map((item) => this.evaluatePayloadForServerValue(item));

				const newPayload = Object.entries(payload).reduce(
					(acc, [key, value]) => {
						acc[key] = this.evaluatePayloadForServerValue(value);
						return acc;
					},
					{} as Record<string, unknown>
				);

				return newPayload;
			}
			default:
				throw new TypeError(`Invalid incoming payload type: ${typeof payload}`);
		}
	}

	/**
	 * Gets the Query Constraints from the message received or from the node configuration.
	 * Calls the `valueFromType` method to replace the value of the value field with its real value from the type.
	 *
	 * Example: user defined `msg.topic`, type is `msg`, saved value `topic` and real value is the content of `msg.topic`.
	 *
	 * @param msg The message received
	 * @returns The Query Constraints
	 */
	protected getQueryConstraints(msg?: InputMessageType) {
		if (this.isFirebaseOutNode(this.node)) return {};

		if (msg?.method) return msg.method;

		const constraints = deepCopy(this.node.config.constraint ?? {});

		// Firebase IN (no context/msg here)
		if (!msg) return constraints;

		for (const value of Object.values(constraints)) {
			if (value && typeof value === "object") {
				if (value.value === undefined) continue;
				value.value = this.valueFromType(msg, value.value, value.type);
			}
		}

		return constraints;
	}

	/**
	 * This method checks if the database uses the `firebase-admin` module.
	 * @param db The database used
	 * @returns `true` if the database uses the `firebase-admin` module.
	 */
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	protected isAdmin(db: Database | admin.database.Database): db is admin.database.Database {
		return this.node.database?.config.authType === "privateKey";
	}

	/**
	 * Checks if the given node matches the `Firebase GET` node.
	 * @param node The node to check.
	 * @returns `true` if the node matches the `Firebase GET` node.
	 */
	protected isFirebaseGetNode(node: FirebaseNodeType): node is FirebaseGetNodeType {
		if (node.type === "firebase-get") return true;
		return false;
	}

	/**
	 * Checks if the given node matches the `Firebase IN` node.
	 * @param node The node to check.
	 * @returns `true` if the node matches the `Firebase IN` node.
	 */
	protected isFirebaseInNode(node: FirebaseNodeType): node is FirebaseInNodeType {
		if (node.type === "firebase-in") return true;
		return false;
	}

	/**
	 * Checks if the given node matches the `Firebase OUT` node.
	 * @param node The node to check.
	 * @returns `true` if the node matches the `Firebase OUT` node.
	 */
	protected isFirebaseOutNode(node: FirebaseNodeType): node is FirebaseOutNodeType {
		if (node.type === "firebase-out") return true;
		return false;
	}

	/**
	 * Checks and waits for the user to be logged in.
	 * The Promise will be resolved when the `signedIn` event is triggered with the status of the connection.
	 * @returns A boolean promise of the user's login state.
	 */
	protected isUserSignedIn(): Promise<boolean> {
		return new Promise((resolve, reject) => {
			try {
				if (this.node.database?.signedIn !== undefined) {
					resolve(this.node.database?.signedIn);
					return;
				}

				this.signedInCallback = (isSignedIn) => {
					resolve(isSignedIn);
				};

				this.node.RED.events.on("Firebase:signedIn", this.signedInCallback);
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * A custom method on error to set node status as `Error` or `Permission Denied`.
	 * @param error The error received
	 * @param done If defined, a function to be called when all the work is complete and return the error message.
	 */
	protected onError(error: unknown, done?: (error?: unknown) => void) {
		const msg = error instanceof Error ? error.message : (error as object | string).toString();

		if (msg.match(/(permission_denied|Permission denied)/gm)) {
			this.permissionDeniedStatus = true;
			this.setNodeStatus("Permission Denied");
		} else {
			this.setNodeStatus("Error", 5000);
		}

		if (done) return done(error);

		this.node.error(msg);
	}

	/**
	 * Registers the node to the database.
	 *
	 * Calls the `restoreDestroyedConnection` method to restore the connection with Firebase if it has been destroyed
	 * because it is unused.
	 */
	public registerNode() {
		// TODO: Limit properties (Omit)
		this.node.database?.nodes.push(this.node);
		this.node.database?.restoreDestroyedConnection();
	}

	/**
	 * This method is called when a DataSnapshot is received in order to send a `payload` containing the desired data.
	 * @param snapshot A DataSnapshot contains data from a Database location.
	 * @param child A string containing the key of the previous child, by sort order,
	 * or `null` if it is the first child.
	 * @param msg The message to pass through.
	 */
	protected sendMsg(snapshot: DataSnapshot, child?: string | null, msg?: InputMessageType) {
		if (this.isFirebaseOutNode(this.node)) return;

		try {
			// Clear Permission Denied Status
			if (this.permissionDeniedStatus) {
				this.permissionDeniedStatus = false;
				this.setNodeStatus();
			}

			const topic = snapshot.ref.key?.toString() || "";
			const payload = this.node.config.outputType === "string" ? JSON.stringify(snapshot.val()) : snapshot.val();
			const previousChildName = child !== undefined ? { previousChildName: child } : {};
			const priority = snapshot instanceof firebase.DataSnapshot ? snapshot.priority : snapshot.getPriority();
			const msgToSend: OutputMessageType = {
				...(msg || {}),
				payload: payload,
				...previousChildName,
				priority: priority,
				topic: topic,
			};

			this.node.send(msgToSend);
		} catch (error) {
			this.onError(error);
		}
	}

	/**
	 * Sets the status of node. If `msg` is defined, the status fill will be set to `red` with the message `msg`.
	 * @param msg If defined, the message to display on the status.
	 * @param time If defined, the status will be cleared (to current status) after `time` ms.
	 */
	public setNodeStatus(msg?: string, time?: number) {
		if (!this.node.database) return;

		// Corresponds to do a Clear Status
		if (msg && time) {
			clearTimeout(this.errorTimeoutID);
			this.errorTimeoutID = setTimeout(() => this.setNodeStatus(), time);
		}

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

	/**
	 * Find the value based on the received type. The `value` parameter received can either be the returned value or
	 * be the key of a content in the message or in the context.
	 *
	 * Example: msg contains `msg.uid`, the value is `uid` and the type is `msg`. The returned value is the content of `msg.uid`.
	 *
	 * @param msg The message received
	 * @param value The value of the Value Field
	 * @param type The type of the Value Field
	 * @returns The content of the value associated to the type
	 */
	private valueFromType(msg: InputMessageType, value: ValueFieldType, type: ChildFieldType): ValueFieldType {
		if (type === "bool" || type === "date" || type === "null" || type === "num" || type === "str") return value;

		if (type !== "flow" && type !== "global" && type !== "msg")
			throw new Error("The type of value field should be 'flow', 'global' or 'msg', please re-configure this node.");

		if (type === "msg") return this.node.RED.util.getMessageProperty(msg, value as string);

		const contextKey = this.node.RED.util.parseContextStore(value as string);

		if (/\[msg\./.test(contextKey.key)) {
			// The key has a nest msg. reference to evaluate first
			contextKey.key = this.node.RED.util.normalisePropertyExpression(contextKey.key, msg, true);
		}

		const output = this.node.context()[type].get(contextKey.key, contextKey.store);

		if (typeof output !== "boolean" && typeof output !== "number" && typeof output !== "string" && output !== null)
			throw new Error("The context value used must be one of the types 'boolean', 'number', 'string' or 'null'");

		return output;
	}
}

/**
 * `FirebaseGet` SubClass of Parent `Firebase` Class
 *
 * This class is used to communicate with Google Firebase Realtime Databases.
 *
 * The modules used are `firebase` and `firebase-admin`.
 *
 * Fetches data from the specified path. Query constraints can be used to sort and order your data.
 *
 * @param node The node to associate with this class
 * @returns FirebaseGet Class
 */
export class FirebaseGet extends Firebase {
	constructor(protected node: FirebaseGetNodeType) {
		super(node);
	}

	/**
	 * Fetch data from database. This method calls `sendMsg` to send a `payload` containing the desired data.
	 * @param msg The message received
	 * @returns A promise of completion of the request
	 */
	public async doGetQuery(msg: InputMessageType) {
		const msg2PassThrough = this.node.config.passThrough ? msg : undefined;
		const constraint = this.getQueryConstraints(msg);
		const path = this.getPath(msg);
		let snapshot;

		if (!this.db) return;

		if (!(await this.isUserSignedIn())) return;

		if (this.isAdmin(this.db)) {
			const database = path ? this.db.ref().child(path) : this.db.ref();

			snapshot = await this.applyQueryConstraints(constraint, database).get();
		} else {
			snapshot = await get(query(ref(this.db, path), ...this.applyQueryConstraints(constraint)));
		}

		this.sendMsg(snapshot, undefined, msg2PassThrough);
	}

	/**
	 * Gets the path to the database from the node or message. Calls `checkPath` to check the path.
	 * @param msg The message received
	 * @returns The path checked to the database
	 */
	private getPath(msg: InputMessageType) {
		const pathSetted = this.node.config.path;
		let path;

		if (pathSetted === undefined) throw new Error("The 'Path' field is undefined, please re-configure this node.");

		switch (this.node.config.pathType) {
			case "msg":
				path = this.node.RED.util.getMessageProperty(msg, pathSetted);
				break;
			case "str":
				path = pathSetted;
				break;
			default:
				throw new Error("pathType should be 'msg' or 'str', please re-configure this node.");
		}

		return this.checkPath(path || undefined, true);
	}
}

/**
 * `FirebaseIn` SubClass of Parent `Firebase` Class
 *
 * This class is used to communicate with Google Firebase Realtime Databases.
 *
 * The modules used are `firebase` and `firebase-admin`.
 *
 * Subscribes to data at the specified path, which yields a `payload` whenever a value changes.
 *
 * @param node The node to associate with this class
 * @returns A `FirebaseIn` Class
 */
export class FirebaseIn extends Firebase {
	constructor(protected node: FirebaseInNodeType) {
		super(node);
	}

	/**
	 * Gets the listener from the node and checks if it is valid.
	 */
	private listener = this.getListener();

	/**
	 * Gets the path to the database from the node.
	 */
	private path = this.checkPath(this.node.config.path || undefined, true);

	/**
	 * This property contains the **method to call** (`firebase`) or the **subscription callback** to give as an argument
	 * (`firebase-admin`) for the unsubscribe request.
	 */
	private subscriptionCallback?: Unsubscribe | ((a: admin.database.DataSnapshot | null, b?: string | null) => void);

	/**
	 * Subscribes to a listener and attaches a callback (`sendMsg`) to send a `payload` containing the changed data.
	 * Calls `checkPath` to check the path.
	 */
	public doSubscriptionQuery() {
		(async () => {
			try {
				const constraint = this.getQueryConstraints();

				if (!this.db) return;

				if (!(await this.isUserSignedIn())) return;

				if (this.isAdmin(this.db)) {
					const databaseRef = this.path ? this.db.ref().child(this.path) : this.db.ref();

					this.subscriptionCallback = this.applyQueryConstraints(constraint, databaseRef).on(
						this.listener,
						(snapshot, child) => this.sendMsg(snapshot, child),
						(error) => this.onError(error)
					);
				} else {
					this.subscriptionCallback = firebase[Listener[this.listener]](
						query(ref(this.db, this.path), ...this.applyQueryConstraints(constraint)),
						(snapshot: firebase.DataSnapshot, child?: string | null) => this.sendMsg(snapshot, child),
						(error) => this.onError(error)
					);
				}
			} catch (error) {
				this.node.error(error);
			}
		})();
	}

	/**
	 * Unsubscribes from the listener in order to detach a callback (`sendMsg`) previously attached to the listener.
	 */
	public doUnSubscriptionQuery() {
		if (!this.db) return;

		if (this.isAdmin(this.db)) {
			const databaseRef = this.path ? this.db.ref().child(this.path) : this.db.ref();

			databaseRef.off(this.listener, this.subscriptionCallback);
		} else {
			if (this.subscriptionCallback) (this.subscriptionCallback as () => void)();
		}
	}

	/**
	 * Gets the listener from the node and throws an error if it's not valid.
	 * @returns The listener checked
	 */
	private getListener() {
		const listener = this.node.config.listenerType || "value";

		if (listener in Listener) return listener as ListenerType;

		throw new Error(`The Listener should be one of ${printEnumKeys(Listener)}. Please re-configure this node.`);
	}
}

/**
 * `FirebaseOut` SubClass of Parent `Firebase` Class
 *
 * This class is used to write data to Firebase Database.
 * `SET`, `PUSH`, `UPDATE`, `REMOVE`, `SET PRIORITY` or `SET WITH PRIORITY` data at the target Database.
 *
 * @param node The node to associate with this class
 * @returns A `FirebaseOut` Class
 */
export class FirebaseOut extends Firebase {
	constructor(protected node: FirebaseOutNodeType) {
		super(node);
	}

	/**
	 * Checks if the priority is valid otherwise throws an error.
	 * @param priority The priority to be checked
	 * @returns The priority checked
	 */
	private checkPriority(priority: unknown) {
		if (priority === undefined) throw new Error("msg.priority do not exist!");
		if (typeof priority === "number") return priority;
		if (typeof priority === "string" && Number.isInteger(parseInt(priority))) return parseInt(priority);
		throw new Error("msg.priority must be a number!");
	}

	/**
	 * Checks if the query is valid otherwise throws an error.
	 * @param method The query to be checked
	 * @returns The query checked
	 */
	private checkQuery(method: unknown) {
		if (method === undefined) throw new Error("msg.method do not exist!");
		if (typeof method !== "string") throw new Error("msg.method must be a string!");
		if (method in Query) return method as keyof typeof Query;
		throw new Error(`msg.method must be one of ${printEnumKeys(Query)}.`);
	}

	/**
	 * `SET`, `PUSH`, `UPDATE`, `REMOVE`, `SET PRIORITY` or `SET WITH PRIORITY` data at the target Database.
	 * @param msg The message to be sent to Firebase Database
	 * @returns A Promise when write/update on server is complete.
	 */
	public async doWriteQuery(msg: InputMessageType) {
		const path = this.getPath(msg);
		const query = this.getQuery(msg);
		const payload = this.evaluatePayloadForServerValue(msg.payload);

		if (!this.db) return Promise.resolve();

		if (!(await this.isUserSignedIn())) return Promise.resolve();

		if (this.isAdmin(this.db)) {
			switch (query) {
				case "update":
					if (payload && typeof payload === "object") {
						await this.db.ref().child(path)[query](payload);
						break;
					}

					throw new Error("msg.payload must be an object with 'update' query.");
				case "remove":
					await this.db.ref().child(path)[query]();
					break;
				case "setPriority":
					await this.db
						.ref()
						.child(path)
						.setPriority(this.getPriority(msg), (err) => {
							if (err) this.node.error(err);
						});
					break;
				case "setWithPriority":
					await this.db.ref().child(path)[query](payload, this.getPriority(msg));
					break;
				default:
					await this.db.ref().child(path)[query](payload);
					break;
			}
		} else {
			switch (query) {
				case "update":
					if (payload && typeof payload === "object") {
						await firebase[query](ref(this.db, path), payload);
						break;
					}

					throw new Error("msg.payload must be an object with 'update' query.");
				case "remove":
					await firebase[query](ref(this.db, path));
					break;
				case "setPriority":
					await firebase[query](ref(this.db, path), this.getPriority(msg));
					break;
				case "setWithPriority":
					await firebase[query](ref(this.db, path), payload, this.getPriority(msg));
					break;
				default:
					await firebase[query](ref(this.db, path), payload);
					break;
			}
		}

		// Clear Permission Denied Status
		if (this.permissionDeniedStatus) {
			this.permissionDeniedStatus = false;
			this.setNodeStatus();
		}
	}

	/**
	 * Gets the path to the database from the node or message. Calls `checkPath` to check the path.
	 * @param msg The message received
	 * @returns The path checked to the database
	 */
	private getPath(msg: InputMessageType) {
		const pathSetted = this.node.config.path;
		let path;

		if (pathSetted === undefined) throw new Error("The 'Path' field is undefined, please re-configure this node.");

		switch (this.node.config.pathType) {
			case "msg":
				path = this.node.RED.util.getMessageProperty(msg, pathSetted);
				break;
			case "str":
				path = pathSetted;
				break;
			default:
				throw new Error("pathType should be 'msg' or 'str', please re-configure this node.");
		}

		return this.checkPath(path, false);
	}

	/**
	 * Gets the priority from the node or message. Calls `checkPriority` to check the priority.
	 * @param msg The message received
	 * @returns The priority checked
	 */
	private getPriority(msg: InputMessageType) {
		const priority = msg.priority !== undefined ? msg.priority : this.node.config.priority;
		return this.checkPriority(priority);
	}

	/**
	 * Gets the query from the node or message. Calls `checkQuery` to check the query.
	 * @param msg The message received
	 * @returns The query checked
	 */
	private getQuery(msg: InputMessageType) {
		const query = this.node.config.queryType === "none" ? msg.method : this.node.config.queryType;
		return this.checkQuery(query);
	}
}
