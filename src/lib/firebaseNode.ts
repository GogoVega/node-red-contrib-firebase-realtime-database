import { Database, DataSnapshot, get, off, ref, query } from "firebase/database";
import firebase from "firebase/database";
import admin from "firebase-admin";
import { NodeMessageInFlow } from "node-red";
import {
	FirebaseGetNodeType,
	FirebaseInNodeType,
	FirebaseNodeType,
	FirebaseOutNodeType,
	InMessageType,
	Listener,
	Listeners,
	OutMessageType,
	Query,
	QueryConstraint,
	QueryConstraintType,
} from "./types/FirebaseNodeType";
import { Entry } from "./types/UtilType";

class FirebaseNode {
	constructor(protected node: FirebaseNodeType) {}

	protected admin = this.node.database?.config.authType === "privateKey";
	protected db = this.node.database?.database;

	protected checkPath(path?: unknown, empty?: boolean) {
		if (empty && path === undefined) return;
		if (!empty && path === undefined) throw new Error("The msg containing the PATH do not exist!");
		if (!empty && !path) throw new Error("PATH must be non-empty string!");
		if (typeof path !== "string") throw new Error("PATH must be a string!");
		if (path?.match(/[.#$\[\]]/g)) throw new Error(`PATH must not contain ".", "#", "$", "[", or "]"`);
		return path;
	}

	public removeNodeStatus() {
		const nodes = this.node.database?.nodes;
		if (!nodes) return;

		nodes.forEach((node) => {
			if (node.id !== this.node.id) return;
			nodes.splice(nodes.indexOf(node), 1);
		});
	}

	protected sendMsg(snapshot: DataSnapshot | admin.database.DataSnapshot, child?: string | null) {
		try {
			if (!snapshot.exists()) return;
			console.log(child);

			const topic = snapshot.ref.key?.toString() || "";
			const payload = this.node.config.outputType === "string" ? JSON.stringify(snapshot.val()) : snapshot.val();

			this.node.send({ payload: payload, previousChildName: child || "", topic: topic } as OutMessageType);
		} catch (error) {
			this.node.error(error);
		}
	}

	public setNodeStatus() {
		if (this.node.database?.connected) {
			this.node.status({ fill: "green", shape: "dot", text: "connected" });
		} else {
			this.node.status({ fill: "yellow", shape: "ring", text: "connecting" });
		}
	}
}

export class FirebaseGetNode extends FirebaseNode {
	constructor(protected node: FirebaseGetNodeType) {
		super(node);
	}

	private applyQueryConstraints(ref: admin.database.Reference, method: unknown) {
		const constraints = this.checkQueryConstraint(method);

		for (const [method, value] of Object.entries(constraints) as Entry<QueryConstraintType | Record<string, never>>[]) {
			switch (method) {
				case "endAt":
				case "endBefore":
				case "equalTo":
				case "startAfter":
				case "startAt":
					ref[method](value.value, value.key);
					break;
				case "limitToFirst":
				case "limitToLast":
					ref[method](value);
					break;
				case "orderByChild":
					ref[method](value);
					break;
				case "orderByKey":
				case "orderByPriority":
				case "orderByValue":
					ref[method]();
					break;
			}
		}

		return ref;
	}

	private checkQueryConstraint(constraints: unknown): QueryConstraintType | Record<string, never> {
		if (constraints === undefined || constraints === null) return {};
		if (typeof constraints !== "object") throw new Error("Query Constraint must be an Object!");

		for (const [method, value] of Object.entries(constraints)) {
			if (method in QueryConstraint) {
				switch (method) {
					case "endAt":
					case "endBefore":
					case "equalTo":
					case "startAfter":
					case "startAt":
						if (typeof value !== "object") throw new Error(`The "${method}" Constraint must be an Object!`);
						if (value.value === undefined)
							if (
								typeof value.value !== "string" &&
								typeof value.value !== "boolean" &&
								typeof value.value !== "number"
							)
								throw new Error();

						if (value.key && typeof value.key !== "string") throw new Error();
						break;
					case "limitToFirst":
					case "limitToLast":
						if (typeof value !== "number") throw new Error();
						break;
					case "orderByChild":
						if (typeof value !== "string") throw new Error();
						break;
					case "orderByKey":
					case "orderByPriority":
					case "orderByValue":
						if (value !== undefined) throw new Error();
						break;
					default:
						throw new Error(`Query constraint received: '${method}' but must be one of ${QueryConstraint.toString()}`);
				}
			}
		}

		return constraints as QueryConstraintType;
	}

	public async doGetQuery(msg: InMessageType) {
		const path = this.getPath(msg);
		let snapshot;

		if (!this.db) return;

		if (admin) {
			const database = path
				? (this.db as admin.database.Database).ref().child(path)
				: (this.db as admin.database.Database).ref();
			this.applyQueryConstraints(database, msg.method);

			snapshot = await database.get();
		} else {
			snapshot = await get(query(ref(this.db as Database, path), ...this.getQueryConstraints(msg.method)));
		}

		this.sendMsg(snapshot);
	}

	private getPath(msg: NodeMessageInFlow) {
		let path;

		switch (this.node.config.pathType) {
			case "msg":
				path = msg[this.node.config.path as keyof typeof msg];
				break;
			case "str":
				path = this.node.config.path;
				break;
			default:
				throw new Error("pathType should be 'msg' or 'str'");
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

export class FirebaseInNode extends FirebaseNode {
	constructor(protected node: FirebaseInNodeType) {
		super(node);
	}

	private listener = this.getListener();
	private path = this.node.config.path?.toString() || undefined;

	public doSubscriptionQuery() {
		const pathParsed = this.checkPath(this.path, true);

		if (!this.db) return;

		if (this.admin) {
			const databaseRef = pathParsed
				? (this.db as admin.database.Database).ref().child(pathParsed)
				: (this.db as admin.database.Database).ref();

			databaseRef.on(
				this.listener,
				(snapshot, child) => this.sendMsg(snapshot, child),
				(error) => this.node.error(error)
			);
		} else {
			firebase[Listener[this.listener]](
				firebase.ref(this.db as Database, pathParsed),
				(snapshot: DataSnapshot, child: string | null | undefined) => this.sendMsg(snapshot, child),
				(error) => this.node.error(error)
			);
		}

		this.node.subscribed = true;

		const listenersObject = this.node.database?.subscribedListeners[this.listener];
		if (!listenersObject) return;
		if (listenersObject[pathParsed ?? ""] === undefined) listenersObject[pathParsed ?? ""] = 0;
		listenersObject[pathParsed ?? ""]++;
	}

	public doUnSubscriptionQuery() {
		if (!this.node.subscribed) return;

		// Do not remove the listener if the same path is used several times
		if (!this.node.database?.subscribedListeners) return;
		if (this.node.database.subscribedListeners[this.listener][this.path ?? ""] > 1) {
			this.node.database.subscribedListeners[this.listener][this.path ?? ""]--;
			return;
		}

		delete this.node.database?.subscribedListeners[this.listener][this.path ?? ""];

		if (!this.db) return;

		if (admin) {
			const databaseRef = this.path
				? (this.db as admin.database.Database).ref().child(this.path)
				: (this.db as admin.database.Database).ref();

			databaseRef.off(this.listener);
		} else {
			off(ref(this.db as Database, this.path), this.listener);
		}
	}

	private getListener() {
		const listener = this.node.config.listenerType || "value";

		if (listener in Listener) return listener as Listeners;

		throw new Error(`msg.method must be ${Object.keys(Listener).toString()}`);
	}
}

// TODO: Add others methods
export class FirebaseOutNode extends FirebaseNode {
	constructor(protected node: FirebaseOutNodeType) {
		super(node);
	}

	public doWriteQuery(msg: InMessageType) {
		const path = this.getPath(msg) as string;
		const query = this.getQuery(msg);

		//if (!this.db) throw new Error();
		if (!this.db) return;

		if (this.admin) {
			return (this.db as admin.database.Database).ref().child(path)[query](msg.payload);
		} else {
			if (query === "update") {
				if (msg.payload && typeof msg.payload === "object")
					return firebase[query](ref(this.db as Database, path), msg.payload);
				throw new Error();
			} else {
				return firebase[query](ref(this.db as Database, path), msg.payload);
			}
		}
	}

	private getPath(msg: NodeMessageInFlow) {
		let path;

		switch (this.node.config.pathType) {
			case "msg":
				path = msg[this.node.config.path as keyof typeof msg];
				break;
			case "str":
				path = this.node.config.path;
				break;
			default:
				throw new Error();
		}

		return this.checkPath(path, false);
	}

	private getQuery(msg: InMessageType) {
		const query = this.node.config.queryType === "none" ? msg.method : this.node.config.queryType;
		return this.checkQuery(query);
	}

	private checkQuery(method: unknown) {
		if (method === undefined) throw new Error("msg.method do not exist!");
		if (typeof method !== "string") throw new Error("msg.method must be a string!");
		const query = method.toLowerCase();
		if (query in Query) return query as keyof typeof Query;
		throw new Error(`msg.method must be one of ${Query.toString()}`);
	}
}
