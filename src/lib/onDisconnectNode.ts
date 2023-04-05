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

import { onDisconnect, ref } from "firebase/database";
import { Firebase } from "./firebaseNode";
import { InputMessageType } from "./types/FirebaseNodeType";
import { Query } from "./types/OnDisconnectConfigType";
import { OnDisconnectNodeType, OutputMessageType, SendMsgEvent } from "./types/OnDisconnectNodeType";
import { printEnumKeys } from "./utils";

/**
 * OnDisconnect Class
 */
export class OnDisconnect extends Firebase {
	constructor(protected node: OnDisconnectNodeType) {
		super(node);
	}

	private sendMsgOnConnected = () => this.sendMsgOnEvent("connected");

	private sendMsgOnDisconnect = () => this.sendMsgOnEvent("disconnect");

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

	public override deregisterNode(removed: boolean, done: (error?: unknown) => void) {
		try {
			const nodes = this.node.database?.nodes;

			if (this.signedInCallback) this.node.RED.events.removeListener("Firebase:signedIn", this.signedInCallback);
			this.node.RED.events.removeListener("Firebase:connected", this.sendMsgOnConnected);
			this.node.RED.events.removeListener("Firebase:disconnect", this.sendMsgOnDisconnect);

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
	 * Gets the path to the database from the node or message. Calls `checkPath` to check the path.
	 * @param msg The message received
	 * @returns The path checked to the database
	 */
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

		return this.checkPath(path, false);
	}

	/**
	 * Gets the priority from the node or message. Calls `checkPriority` to check the priority.
	 * @param msg The message received
	 * @returns The priority checked
	 */
	private getPriority(msg: InputMessageType) {
		return this.checkPriority(msg.priority);
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

	private sendMsgOnEvent(event: SendMsgEvent) {
		try {
			if (!this.node.database) return;

			const msg2Send: OutputMessageType = {
				payload: Date.now(),
				event: event,
				topic: this.node.database.app?.options.databaseURL || "",
			};

			this.node.send(msg2Send);
		} catch (error) {
			this.node.error(error);
		}
	}

	private setNodeQueryDone() {
		this.node.status({ fill: "blue", shape: "dot", text: "Query Done!" });
		setTimeout(() => this.setNodeStatus(), 500);
	}

	public async setOnDisconnectQuery(msg: InputMessageType) {
		const path = this.getPath(msg);
		const query = this.getQuery(msg);

		if (!this.db) return;

		if (!(await this.isUserSignedIn())) return Promise.resolve();

		const databaseRef = this.isAdmin(this.db)
			? this.db.ref().child(path).onDisconnect()
			: onDisconnect(ref(this.db, path));

		switch (query) {
			case "cancel":
			case "remove":
				await databaseRef[query]();
				break;
			case "set":
				await databaseRef[query](msg.payload);
				break;
			case "update":
				if (msg.payload && typeof msg.payload === "object") {
					await databaseRef[query](msg.payload);
					break;
				}

				throw new Error("msg.payload must be an object with 'update' query.");
			case "setWithPriority":
				await databaseRef[query](msg.payload, this.getPriority(msg));
				break;
		}

		this.setNodeQueryDone();

		// Clear Permission Denied Status
		if (this.permissionDeniedStatus) {
			this.permissionDeniedStatus = false;
		}
	}

	public setMsgSendHandler() {
		const events = this.node.config.sendMsgEvent?.split(",");
		if (!events) return;

		if (events.includes("onConnected")) this.node.RED.events.on("Firebase:connected", this.sendMsgOnConnected);
		if (events.includes("onDisconnect")) this.node.RED.events.on("Firebase:disconnect", this.sendMsgOnDisconnect);
	}
}
