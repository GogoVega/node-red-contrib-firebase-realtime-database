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

import {
	BothDataSnapshot,
	Constraint,
	isAdminDataSnapshot,
	ListenerMap,
	QueryMethod,
	QueryMethodMap,
	ServerValue,
	Unsubscribe,
} from "@gogovega/firebase-config-node/rtdb";
import { ConfigNode, ServiceType } from "@gogovega/firebase-config-node/types";
import { deepCopy, Entry, isFirebaseConfigNode } from "@gogovega/firebase-config-node/utils";
import { NodeAPI, NodeMessage } from "node-red";
import {
	ChildField,
	FirebaseConfig,
	FirebaseGetConfig,
	FirebaseGetNode,
	FirebaseInConfig,
	FirebaseInNode,
	FirebaseNode,
	FirebaseOutConfig,
	FirebaseOutNode,
	IncomingMessage,
	ListenerType,
	NodeConfig,
	OutgoingMessage,
	PathType,
	QueryConstraint,
	ValueField,
} from "./types";
import { checkPath, checkPriority, printEnumKeys } from "./utils";

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
export class Firebase<Node extends FirebaseNode, Config extends FirebaseConfig = NodeConfig<Node>> {
	/**
	 * This property contains the identifier of the timer used to define the error status of the node and will be used
	 * to clear the timeout.
	 */
	private errorTimeoutID?: ReturnType<typeof setTimeout>;

	/**
	 * This property is used to store the "Permission Denied" state of the node.
	 * Error received when database rules deny reading/writing data.
	 */
	protected permissionDeniedStatus = false;

	private readonly serviceType: ServiceType = "rtdb";

	constructor(
		protected node: Node,
		config: Config,
		protected RED: NodeAPI
	) {
		node.config = config;
		node.database = RED.nodes.getNode(config.database) as ConfigNode | null;

		if (!node.database) {
			node.error("Database not configured or disabled!");
			node.status({ fill: "red", shape: "ring", text: "Database not ready!" });
		}

		if (!isFirebaseConfigNode(node.database))
			throw new Error("The selected database is not compatible with this module, please check your config-node");
	}

	/**
	 * Gets the RTDB instance from the `config-node`.
	 */
	protected get rtdb() {
		return this.node.database?.rtdb;
	}

	public attachStatusListener() {
		this.node.database?.addStatusListener(this.node.id, this.serviceType);
	}

	public detachStatusListener(removed: boolean, done: () => void) {
		this.node.database?.removeStatusListener(this.node.id, this.serviceType, removed, done);
	}

	protected evaluateContextExpression(
		msg: IncomingMessage,
		value: string,
		context: "flow" | "global"
	): Promise<unknown> {
		return new Promise((resolve, reject) => {
			if (typeof msg !== "object" || !msg) throw new TypeError("The incoming message must be an object");
			if (typeof value !== "string" || !value) throw new TypeError("The message property to evaluate must be a string");

			const contextKey = this.RED.util.parseContextStore(value);

			if (/\[msg\./.test(contextKey.key)) {
				// The key has a nest msg. reference to evaluate first
				contextKey.key = this.RED.util.normalisePropertyExpression(contextKey.key, msg, true);
			}

			return this.node.context()[context].get(contextKey.key, contextKey.store, (error, response) => {
				if (error) return reject(error);

				resolve(response);
			});
		});
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

				const newPayload = Object.entries(payload).reduce<Record<string, unknown>>((acc, [key, value]) => {
					acc[key] = this.evaluatePayloadForServerValue(value);
					return acc;
				}, {});

				return newPayload;
			}
			default:
				throw new TypeError(`Invalid incoming payload type: ${typeof payload}`);
		}
	}

	protected getMessageProperty(msg: IncomingMessage, property: string): unknown {
		if (typeof msg !== "object" || !msg) throw new TypeError("The incoming message must be an object");
		if (typeof property !== "string" || !property)
			throw new TypeError("The message property to evaluate must be a string");

		return this.RED.util.getMessageProperty(msg, property);
	}

	protected getPath(msg: IncomingMessage | undefined, empty: true): string | undefined;
	protected getPath(msg?: IncomingMessage | undefined, empty?: false): string;
	protected getPath(msg?: IncomingMessage, empty?: boolean): string | undefined {
		const path = this.getPathFromType(this.node.config.path, this.node.config.pathType, msg);

		return checkPath(path, empty);
	}

	protected getPathFromType(value?: string, type?: PathType, msg?: IncomingMessage): unknown {
		if (typeof value !== "string") throw new Error("The 'Path' field is undefined, please re-configure this node.");

		// TODO: Remove Me
		if (this.isFirebaseInNode(this.node) && type === undefined) type = "str";

		if (!msg && type !== "str") throw new Error("Incoming message missing to evaluate the path");

		switch (type) {
			case "msg":
				return this.getMessageProperty(msg!, value);
			case "str":
				return value;
			default:
				throw new Error(`The pathType (${type}) is invalid, please re-configure this node`);
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
	protected async getQueryConstraints(msg?: IncomingMessage): Promise<Constraint> {
		if (this.isFirebaseOutNode(this.node)) throw new Error("Constraints not available for modify method");

		// @deprecated
		if (msg?.method) return msg.method as unknown as object;
		if (msg?.constraints) return msg.constraints;

		// TODO: Change constraint to plural
		const constraints = deepCopy(this.node.config.constraint ?? {});

		if (typeof constraints !== "object") throw new Error("The 'Query Constraints' must be an object.");

		// TODO: Use reduce to replace the loop
		for (const value of Object.values(constraints) as Entry<QueryConstraint>) {
			if (value && typeof value === "object") {
				if (value.value === undefined) continue;
				const newValue = await this.getValueFieldFromType(value.value, value.type, msg);

				if (
					typeof newValue !== "boolean" &&
					typeof newValue !== "number" &&
					typeof newValue !== "string" &&
					newValue !== null
				)
					throw new TypeError("Values of Query Constraints must be a boolean, number, string or null!");

				value.value = newValue;
			}
		}

		return constraints;
	}

	/**
	 * Find the value based on the received type. The `value` parameter received can either be the returned value or
	 * be the key of a content in the message or in the context.
	 *
	 * Example: msg contains `msg.uid`, the value is `uid` and the type is `msg`. The returned value is the content of `msg.uid`.
	 *
	 * @param value The value of the Value Field
	 * @param type The type of the Value Field
	 * @param msg The message received
	 * @returns The content of the value associated to the type
	 */
	protected async getValueFieldFromType(value: ValueField, type: ChildField, msg?: IncomingMessage): Promise<unknown> {
		switch (type) {
			case "bool":
			case "date":
			case "null":
			case "num":
			case "str":
				return value;
			case "msg":
				if (!msg) throw new Error("Incoming message missing to evaluate the Query Constraints");
				return this.getMessageProperty(msg, value as string);
			case "flow":
			case "global":
				if (!msg) throw new Error("Incoming message missing to evaluate the Query Constraints");
				return await this.evaluateContextExpression(msg, value as string, type);
			default:
				throw new Error(`The type of value field (${type}) is invalid, please re-configure this node.`);
		}
	}

	/**
	 * Checks if the given node matches the `Firebase GET` node.
	 * @param node The node to check.
	 * @returns `true` if the node matches the `Firebase GET` node.
	 */
	protected isFirebaseGetNode(node: FirebaseNode): node is FirebaseGetNode {
		return node.type === "firebase-get";
	}

	/**
	 * Checks if the given node matches the `Firebase IN` node.
	 * @param node The node to check.
	 * @returns `true` if the node matches the `Firebase IN` node.
	 */
	protected isFirebaseInNode(node: FirebaseNode): node is FirebaseInNode {
		return node.type === "firebase-in";
	}

	/**
	 * Checks if the given node matches the `Firebase OUT` node.
	 * @param node The node to check.
	 * @returns `true` if the node matches the `Firebase OUT` node.
	 */
	protected isFirebaseOutNode(node: FirebaseNode): node is FirebaseOutNode {
		return node.type === "firebase-out";
	}

	/**
	 * A custom method on error to set node status as `Error` or `Permission Denied`.
	 * @param error The error received
	 * @param done If defined, a function to be called to return the error message.
	 */
	protected onError(error: unknown, done?: (error?: Error) => void) {
		const msg = error instanceof Error ? error.message : "";

		if (/(permission_denied|Permission denied)/gm.test(msg)) {
			this.setStatus("Permission Denied");
		} else {
			this.setStatus("Error", 5000);
		}

		if (done) return done(error as Error);

		this.node.error(error);
	}

	/**
	 * This method is called when a DataSnapshot is received in order to send a `payload` containing the desired data.
	 * @param snapshot A DataSnapshot contains data from a Database location.
	 * @param child A string containing the key of the previous child, by sort order,
	 * or `null` if it is the first child.
	 * @param msg The message to pass through.
	 */
	protected sendMsg(
		snapshot: BothDataSnapshot,
		child?: string | null,
		msg?: IncomingMessage,
		send?: (msg: NodeMessage) => void
	) {
		if (this.isFirebaseOutNode(this.node)) return;

		// Clear Permission Denied Status
		if (this.permissionDeniedStatus) {
			this.permissionDeniedStatus = false;
			this.setStatus();
		}

		const topic = snapshot.ref.key?.toString() || "";
		const payload = this.node.config.outputType === "string" ? JSON.stringify(snapshot.val()) : snapshot.val();
		const previousChildName = child !== undefined ? { previousChildName: child } : {};
		const priority = isAdminDataSnapshot(snapshot) ? snapshot.getPriority() : snapshot.priority;
		const msg2Send: OutgoingMessage = {
			...(msg || {}),
			payload: payload,
			...previousChildName,
			priority: priority,
			topic: topic,
		};

		if (send) return send(msg2Send);

		this.node.send(msg2Send);
	}

	/**
	 * Sets the status of node. If `msg` is defined, the status fill will be set to `red` with the message `msg`.
	 * @param msg If defined, the message to display on the status.
	 * @param time If defined, the status will be cleared (to current status) after `time` ms.
	 */
	protected setStatus(status: string = "", time?: number) {
		// Clear the status to the current after ms
		if (status && time) {
			clearTimeout(this.errorTimeoutID);
			this.errorTimeoutID = setTimeout(() => this.setStatus(), time);
		}

		switch (status) {
			case "Error":
				this.node.status({ fill: "red", shape: "dot", text: status });
				break;
			case "Permission Denied":
				this.permissionDeniedStatus = true;
				this.node.status({ fill: "red", shape: "ring", text: "Permission Denied!" });
				break;
			case "Query Done":
				this.node.status({ fill: "blue", shape: "dot", text: "Query Done!" });
				break;
			case "":
				this.node.database?.setCurrentStatus(this.node.id);
				break;
			default:
				this.node.status({ fill: "red", shape: "dot", text: status });
				break;
		}
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
export class FirebaseGet extends Firebase<FirebaseGetNode> {
	constructor(node: FirebaseGetNode, config: FirebaseGetConfig, RED: NodeAPI) {
		super(node, config, RED);
	}

	/**
	 * Fetch data from database. This method calls `sendMsg` to send a `payload` containing the desired data.
	 * @param msg The message received
	 * @returns A promise of completion of the request
	 */
	public get(msg: IncomingMessage, send: (msg: NodeMessage) => void, done: (error?: Error) => void): void {
		(async () => {
			try {
				const path = this.getPath(msg, true);
				const constraints = await this.getQueryConstraints(msg);
				const msg2PassThrough = this.node.config.passThrough ? msg : undefined;

				if (!this.rtdb) return;

				if (!(await this.node.database?.clientSignedIn())) return;

				const snapshot = await this.rtdb.get(path, constraints);

				this.sendMsg(snapshot, undefined, msg2PassThrough, send);

				done();
			} catch (error) {
				this.onError(error, done);
			}
		})();
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
export class FirebaseIn extends Firebase<FirebaseInNode> {
	/**
	 * This property contains the **method to call** to unsubscribe the listener
	 */
	private unsubscribeCallback?: Unsubscribe;

	constructor(node: FirebaseInNode, config: FirebaseInConfig, RED: NodeAPI) {
		super(node, config, RED);
	}

	/**
	 * Gets the listener from the node and throws an error if it's not valid.
	 * @returns The listener checked
	 */
	private getListener(): ListenerType {
		const listener = this.node.config.listenerType;

		if (typeof listener === "string" && listener in ListenerMap) return listener;

		throw new Error(`The Listener should be one of ${printEnumKeys(ListenerMap)}. Please re-configure this node.`);
	}

	/**
	 * Subscribes to a listener and attaches a callback (`sendMsg`) to send a `payload` containing the changed data.
	 * Calls `checkPath` to check the path.
	 */
	public subscribe(): void {
		(async () => {
			try {
				const listener = this.getListener();
				const path = this.getPath();

				if (!this.rtdb) return;

				if (!(await this.node.database?.clientSignedIn())) return;

				this.unsubscribeCallback = this.rtdb.subscribe(
					listener,
					(snapshot, child) => this.sendMsg(snapshot, child),
					path,
					this.node.config.constraint
				);
			} catch (error) {
				this.onError(error);
			}
		})();
	}

	/**
	 * Unsubscribes from the listener in order to detach a callback (`sendMsg`) previously attached to the listener.
	 */
	public unsubscribe(): void {
		this.unsubscribeCallback && this.unsubscribeCallback();
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
export class FirebaseOut extends Firebase<FirebaseOutNode> {
	constructor(node: FirebaseOutNode, config: FirebaseOutConfig, RED: NodeAPI) {
		super(node, config, RED);
	}

	/**
	 * Checks if the query is valid otherwise throws an error.
	 * @param method The query to be checked
	 * @returns The query checked
	 */
	private checkQueryMethod(method: unknown): QueryMethod {
		if (method === undefined) throw new Error("msg.method do not exist!");
		if (typeof method !== "string") throw new Error("msg.method must be a string!");
		if (method in QueryMethodMap) return method as QueryMethod;
		throw new Error(`msg.method must be one of ${printEnumKeys(QueryMethodMap)}.`);
	}

	/**
	 * Gets the priority from the node or message. Calls `checkPriority` to check the priority.
	 * @param msg The message received
	 * @returns The priority checked
	 */
	private getPriority(msg: IncomingMessage): number {
		const priority = msg.priority || this.node.config.priority;
		return checkPriority(priority);
	}

	/**
	 * Gets the query from the node or message. Calls `checkQuery` to check the query.
	 * @param msg The message received
	 * @returns The query checked
	 */
	private getQueryMethod(msg: IncomingMessage): QueryMethod {
		const query = this.node.config.queryType === "none" ? msg.method : this.node.config.queryType;
		return this.checkQueryMethod(query);
	}

	/**
	 * `SET`, `PUSH`, `UPDATE`, `REMOVE`, `SET PRIORITY` or `SET WITH PRIORITY` data at the target Database.
	 * @param msg The message to be sent to Firebase Database
	 * @returns A Promise when write/update on server is complete.
	 */
	public modify(msg: IncomingMessage, done: (error?: Error) => void): void {
		(async () => {
			try {
				const path = this.getPath(msg);
				const query = this.getQueryMethod(msg);
				const payload = this.evaluatePayloadForServerValue(msg.payload);

				if (!this.rtdb) return Promise.resolve();

				if (!(await this.node.database?.clientSignedIn())) return;

				switch (query) {
					case "update":
						if (payload && typeof payload === "object") {
							await this.rtdb.modify(query, path, payload);
							break;
						}

						throw new Error("msg.payload must be an object with 'update' query.");
					case "remove":
						await this.rtdb.modify(query, path);
						break;
					case "setPriority":
						await this.rtdb.modify(query, path, this.getPriority(msg));
						break;
					case "setWithPriority":
						await this.rtdb.modify(query, path, payload, this.getPriority(msg));
						break;
					default:
						await this.rtdb.modify(query, path, payload);
						break;
				}

				// Clear Permission Denied Status
				if (this.permissionDeniedStatus) {
					this.permissionDeniedStatus = false;
					this.setStatus();
				}

				done();
			} catch (error) {
				this.onError(error, done);
			}
		})();
	}
}
