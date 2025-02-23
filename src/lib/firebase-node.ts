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

import {
	Constraint,
	DataSnapshotType,
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
	QueryConstraintPropertySignature,
} from "./types";
import { checkPath, checkPriority, printEnumKeys } from "./utils";
import { checkConfigNodeSatisfiesVersion } from "../migration/config-node";

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
	private readonly serviceType: ServiceType = "rtdb";

	/**
	 * This property contains the identifier of the timer used to define the error status of the node and will be used
	 * to clear the timeout.
	 */
	private errorTimeoutID?: ReturnType<typeof setTimeout>;

	/**
	 * Incoming msg is needed for this types
	 */
	protected static dynamicFieldTypes = ["flow", "global", "jsonata", "msg"];

	protected static pathFieldTypes = ["flow", "global", "jsonata", "env", "msg", "str"];
	protected static childFieldTypes = ["flow", "global", "jsonata", "env", "msg", "str"];
	protected static limitFieldTypes = ["flow", "global", "jsonata", "env", "msg", "num"];
	protected static rangeFieldTypes = ["bool", "date", "flow", "global", "jsonata", "env", "msg", "null", "num", "str"];

	protected legacyWarningMessageEmitted: boolean = false;

	/**
	 * This property is used to store the "Permission Denied" state of the node.
	 * Error received when database rules deny reading/writing data.
	 */
	protected permissionDeniedStatus = false;

	constructor(
		protected node: Node,
		config: Config,
		protected RED: NodeAPI
	) {
		node.config = config;
		node.database = RED.nodes.getNode(config.database) as ConfigNode | null;

		if (!node.database) {
			node.error("Database not selected or disabled!");
			node.status({ fill: "red", shape: "ring", text: "Database not ready!" });
		} else {
			if (!isFirebaseConfigNode(node.database))
				throw new Error("The selected database is not compatible with this module, please check your config-node");

			if (!checkConfigNodeSatisfiesVersion(RED, node.database.version)) {
				node.status({ fill: "red", shape: "ring", text: "Invalid Database Version!" });

				// To avoid initializing the database (avoid creating unhandled errors)
				node.database = null;
			}
		}
	}

	/**
	 * Gets the RTDB instance from the `config-node`.
	 */
	protected get rtdb() {
		return this.node.database?.rtdb;
	}

	public attachStatusListener() {
		this.node.database?.addStatusListener(this.node, this.serviceType);
	}

	public detachStatusListener(done: () => void) {
		this.node.database?.removeStatusListener(this.node, this.serviceType, done);
		if (!this.node.database) done();
	}

	/**
	 * Evaluates a Query Constraints property value according to its type
	 *
	 * Example: msg contains `msg.uid`, the field value is `uid` and the field type is `msg`. The returned value is the content of `msg.uid`.
	 *
	 * @param value The value of the Field
	 * @param type The type of the Field
	 * @param msg The message received
	 * @returns A promise with the evaluted property
	 */
	private async evaluateConstraintProperty<Field extends keyof QueryConstraintPropertySignature>(
		field: Field,
		...args: QueryConstraintPropertySignature[Field]["args"]
	): Promise<QueryConstraintPropertySignature[Field]["promise"]> {
		const [value, type, msg] = args;
		const typesAllowed =
			field === "child"
				? Firebase.childFieldTypes
				: field === "value"
					? Firebase.rangeFieldTypes
					: Firebase.limitFieldTypes;

		if (!typesAllowed.includes(type))
			throw new Error(`Invalid type (${type}) for the ${field} field. Please reconfigure this node.`);

		let valueFound;
		switch (type) {
			case "null":
				valueFound = null;
				break;
			default:
				valueFound = await this.evaluateNodeProperty(value, type, this.node, msg!);
		}

		if (field === "child" && typeof valueFound !== "string")
			throw new TypeError("The Child value of Query Constraints must be a string!");
		if (field === "limit" && typeof valueFound !== "number" && typeof valueFound !== "string")
			throw new TypeError("The LimitTo... value of Query Constraints must be a number or string!");
		if (
			typeof valueFound !== "boolean" &&
			typeof valueFound !== "number" &&
			typeof valueFound !== "string" &&
			valueFound !== null
		)
			throw new TypeError("Values of Query Constraints must be a boolean, number, string or null!");

		return valueFound;
	}

	/**
	 * Evaluates a node property value according to its type.
	 *
	 * @param value the raw value
	 * @param type the type of the value
	 * @param node the node evaluating the property
	 * @param msg the message object to evaluate against
	 * @return A promise with the evaluted property
	 */
	protected evaluateNodeProperty<T = unknown>(
		value: string,
		type: string,
		node: Node,
		msg?: IncomingMessage
	): Promise<T> {
		return new Promise((resolve, reject) => {
			if (!msg && Firebase.dynamicFieldTypes.includes(type) && (type === "msg" || /\[msg\./.test(value)))
				return reject("Incoming message missing to evaluate the node/msg property.");

			this.RED.util.evaluateNodeProperty(value, type, node, msg!, (error, result) => {
				if (error) return reject(error);

				resolve(result);
			});
		});
	}

	/**
	 * Evaluates a Path property value according to its type
	 *
	 * Example: msg contains `msg.path`, the field value is `path` and the field type is `msg`. The returned value is the content of `msg.path`.
	 *
	 * @param value The value of the Field
	 * @param type The type of the Field
	 * @param msg The message received
	 * @returns A promise with the evaluted property
	 */
	protected evaluatePathProperty(value?: string, type?: PathType, msg?: IncomingMessage): Promise<unknown> {
		if (typeof value !== "string") throw new Error("The 'Path' field is undefined, please re-configure this node.");

		// TODO: Remove Me
		if (this.isFirebaseInNode(this.node) && type === undefined) type = "str";

		if (!Firebase.pathFieldTypes.includes(type!))
			throw new Error(`Invalid type (${type}) for the Path field. Please reconfigure this node.`);

		return this.evaluateNodeProperty(value, type!, this.node, msg!);
	}

	/**
	 * Evaluates the payload message to replace reserved keywords (`TIMESTAMP`, `INCREMENT` and `DECREMENT`) with
	 * the corresponding server value.
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

				if (/^\s*(?:INCREMENT|DECREMENT)\s*-?\d+\.?\d*\s*$/.test(payload)) {
					const deltaString = payload.match(/-?\d+\.?\d*/)?.[0] || "";
					const delta = Number(deltaString);

					if (Number.isNaN(delta)) throw new Error("The delta of increment function must be a valid number.");

					const toOppose = /DECREMENT/.test(payload);
					return ServerValue.increment(toOppose ? -delta : delta);
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

	protected getPath(msg: IncomingMessage | undefined, empty: true): Promise<string | undefined>;
	protected getPath(msg?: IncomingMessage | undefined, empty?: false): Promise<string>;
	protected async getPath(msg?: IncomingMessage, empty?: boolean): Promise<string | undefined> {
		const path = await this.evaluatePathProperty(this.node.config.path, this.node.config.pathType, msg);

		return checkPath(path, empty);
	}

	/**
	 * Gets the Query Constraints from the message received or from the node configuration.
	 * Calls the `valueFromType` method to replace the value of the value field with its real value from the type.
	 *
	 * Example: user defined `msg.topic`, type is `msg`, saved value `topic` and real value is the content of `msg.topic`.
	 *
	 * @param msg The message received
	 * @returns A promise with the Query Constraints
	 */
	protected async getQueryConstraints(msg?: IncomingMessage): Promise<Constraint> {
		if (this.isFirebaseOutNode(this.node)) throw new Error("Constraints not available for modify method");

		// @deprecated
		if (typeof msg?.method === "object" && !this.legacyWarningMessageEmitted) {
			this.node.warn("'msg.method' to define Constraints is deprecated, please use 'msg.constraints' instead");
			this.legacyWarningMessageEmitted = true;
			return msg.method as unknown as object;
		}

		if (msg?.constraints) return msg.constraints;

		// TODO: remove deepCopy
		const constraints = deepCopy(this.node.config.constraint ?? this.node.config.constraints ?? {});

		if (typeof constraints !== "object" || !constraints)
			throw new TypeError("The 'Query Constraints' must be an object.");

		// TODO: Remove deprecated type and value
		return (Object.entries(constraints) as Entry<QueryConstraint>[]).reduce<Promise<Constraint>>(
			async (accP, [key, value]) => {
				const acc = await accP;
				switch (key) {
					case "endAt":
					case "endBefore":
					case "equalTo":
					case "startAfter":
					case "startAt": {
						acc[key] = {
							value: await this.evaluateConstraintProperty(
								"value",
								String(value.value),
								value.type ?? value.types?.value,
								msg
							),
							key:
								(await this.evaluateConstraintProperty("child", value.key ?? "", value.types?.child || "str", msg)) ||
								undefined,
						};
						break;
					}
					case "orderByChild": {
						const val = typeof value === "object" ? value.value : value;
						const type = typeof value === "object" ? value.type : "str";
						acc[key] = await this.evaluateConstraintProperty("child", val, type, msg);
						break;
					}
					case "limitToFirst":
					case "limitToLast": {
						const val = typeof value === "object" ? value.value : value;
						const type = typeof value === "object" ? value.type : "num";
						acc[key] = await this.evaluateConstraintProperty("limit", String(val), type, msg);
						break;
					}
					case "orderByKey":
					case "orderByPriority":
					case "orderByValue":
						acc[key] = null;
						break;
				}

				return acc;
			},
			Promise.resolve({})
		);
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
		const msg = error instanceof Error ? error.message : String(error);

		if (/(permission_denied|Permission denied)/.test(msg)) {
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
		snapshot: DataSnapshotType,
		child?: string | null,
		msg?: IncomingMessage,
		send?: (msg: NodeMessage) => void
	) {
		if (this.isFirebaseOutNode(this.node)) throw new Error("Invalid call to 'sendMsg' by Firebase OUT node");

		// Clear Permission Denied Status
		if (this.permissionDeniedStatus) {
			this.permissionDeniedStatus = false;
			this.setStatus();
		}

		if (!this.isFirebaseInNode(this.node)) this.setStatus("Query Done", 500);

		const topic = snapshot.key;
		const payload =
			this.node.config.outputType === "string"
				? JSON.stringify(snapshot.val())
				: this.node.config.outputType === "json"
					? snapshot.toJSON()
					: snapshot.val();
		const previousChildName = child !== undefined ? { previousChildName: child } : {};
		const priority = snapshot.priority;
		const msg2Send: OutgoingMessage = {
			...(msg || {}),
			payload: payload,
			...previousChildName,
			priority: priority,
			topic: topic,
		};

		if (send) return send(msg2Send as NodeMessage);

		this.node.send(msg2Send as NodeMessage);
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

		if (this.permissionDeniedStatus && status === "") {
			status = "Permission Denied";
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
			case "Subscribed":
			case "Unsubscribed":
				this.node.status({ fill: "blue", shape: "dot", text: status });
				break;
			case "Waiting":
				this.node.status({ fill: "blue", shape: "ring", text: "Waiting for Subscription..." });
				break;
			case "":
				this.node.database?.setCurrentStatus(this.node);
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
				const path = await this.getPath(msg, true);
				const constraints = await this.getQueryConstraints(msg);
				const msg2PassThrough = this.node.config.passThrough ? msg : undefined;

				if (!this.rtdb) return done();

				if (!(await this.node.database?.clientSignedIn())) return done();

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
	 * Whether the node should await a payload to subscribe to data.
	 */
	private isDynamicConfig: boolean = false;

	/**
	 * This property contains the **method to call** to unsubscribe the listener
	 */
	private unsubscribeCallback?: Unsubscribe;

	constructor(node: FirebaseInNode, config: FirebaseInConfig, RED: NodeAPI) {
		super(node, config, RED);

		// No need to re-check all config - if the node has an input, the config is dynamic.
		this.isDynamicConfig = this.node.config.inputs === 1;
	}

	/**
	 * Gets the listener from the node and throws an error if it's not valid.
	 * @returns The listener checked
	 */
	private getListener(msg?: IncomingMessage): ListenerType {
		const { listenerType } = this.node.config;

		// Dynamic Listener ? Skip the static subscription
		if (listenerType === "none" && !msg) return listenerType;

		const listener = listenerType === "none" ? msg?.listener : listenerType;

		if (listener === "reset") return "none"; // Not supposed to happen
		if (typeof listener === "string" && listener in ListenerMap) return listener;

		throw new Error(`The Listener should be one of ${printEnumKeys(ListenerMap)}. Please re-configure this node.`);
	}

	/**
	 * Subscribes to a listener and attaches a callback (`sendMsg`) to send a `payload` containing the changed data.
	 * Calls `checkPath` to check the path.
	 */
	public subscribe(): void;
	public subscribe(msg: IncomingMessage, send: (msg: NodeMessage) => void, done: (error?: Error) => void): void;
	public subscribe(msg?: IncomingMessage, send?: (msg: NodeMessage) => void, done?: (error?: Error) => void): void {
		(async () => {
			try {
				const msg2PassThrough = this.node.config.passThrough ? msg : undefined;

				// Unsubscribe and passthrough the msg
				if (msg && msg.listener === "reset") {
					this.unsubscribe();
					this.setStatus("Unsubscribed");
					if (send && msg2PassThrough) send(msg2PassThrough);
					if (done) done();
					return;
				}

				// Not work when starting the flow
				// TODO: need LocalStatus to resolve it
				this.setStatus("Waiting");

				// Await the listener defined in the incoming message
				const listener = this.getListener(msg);
				if (listener === "none" || (this.isDynamicConfig && !msg)) {
					if (done) done();
					return;
				}

				const path = await this.getPath(msg, true);
				const constraints = await this.getQueryConstraints(msg);

				if (!this.rtdb || !(await this.node.database?.clientSignedIn())) {
					if (done) done();
					return;
				}

				this.unsubscribe();
				this.unsubscribeCallback = this.rtdb.subscribe(
					listener,
					(snapshot, child) => this.sendMsg(snapshot, child),
					(error) => this.onError(error, done),
					path,
					constraints
				);

				this.setStatus("Subscribed", 2000);

				if (send && msg2PassThrough) send(msg2PassThrough);
				if (done) done();
			} catch (error) {
				this.onError(error, done);
			}
		})();
	}

	/**
	 * Unsubscribes from the listener in order to detach a callback (`sendMsg`) previously attached to the listener.
	 */
	public unsubscribe(): void {
		if (this.unsubscribeCallback) {
			this.unsubscribeCallback();
		}
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
				const path = await this.getPath(msg);
				const query = this.getQueryMethod(msg);
				const payload = this.evaluatePayloadForServerValue(msg.payload);

				if (!this.rtdb) return done();

				if (!(await this.node.database?.clientSignedIn())) return done();

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
