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

import { NodeAPI } from "node-red";
import { Firebase } from "./firebase-node";
import { IncomingMessage, OnDisconnectConfig, OnDisconnectMessage, OnDisconnectNode, SendMsgEvent } from "./types";
import { checkPath, checkPriority, printEnumKeys } from "./utils";
import { OnDisconnectQueryMethod, OnDisconnectQueryMethodMap } from "@gogovega/firebase-config-node/rtdb";

/**
 * OnDisconnect Class
 *
 * This class is used to define the query to run **when the client disconnects** from the database.
 *
 * It is used to set, set with priority, update, remove, or cancel data when the client disconnects from the database.
 *
 * This class allows also to send a message when the client disconnects or is connected from the database.
 *
 * @param node The node to associate with this class
 * @returns The `OnDisconnect` class
 * @extends Firebase
 * @class
 */
export class OnDisconnect extends Firebase {
	/**
	 * Callback called for the `connected` event.
	 */
	private sendMsgOnConnected = () => this.sendMsgOnEvent("connected");

	/**
	 * Callback called for the `disconnect` event.
	 */
	private sendMsgOnDisconnect = () => this.sendMsgOnEvent("disconnect");

	constructor(
		protected node: OnDisconnectNode,
		config: OnDisconnectConfig,
		protected RED: NodeAPI
	) {
		super(node, config, RED);
	}

	/**
	 * Checks if the query is valid otherwise throws an error.
	 * @param method The query to be checked
	 * @returns The query checked
	 */
	private checkQueryMethod(method: unknown): OnDisconnectQueryMethod {
		if (method === undefined) throw new Error("msg.method do not exist!");
		if (typeof method !== "string") throw new Error("msg.method must be a string!");
		if (method in OnDisconnectQueryMethodMap) return method as OnDisconnectQueryMethod;
		throw new Error(`msg.method must be one of ${printEnumKeys(OnDisconnectQueryMethodMap)}.`);
	}

	/**
	 * Gets the path to the database from the node or message. Calls `checkPath` to check the path.
	 * @param msg The message received
	 * @returns The path checked to the database
	 */
	private getPath(msg: IncomingMessage): string {
		const { path, pathType } = this.node.config;
		const pathGetted = this.getPathFromType(path, pathType, msg);

		return checkPath(pathGetted, false);
	}

	/**
	 * Gets the priority from the message. Calls `checkPriority` to check the priority.
	 * @param msg The message received
	 * @returns The priority checked
	 */
	private getPriority(msg: IncomingMessage): number {
		return checkPriority(msg.priority);
	}

	/**
	 * Gets the query from the node or message. Calls `checkQuery` to check the query.
	 * @param msg The message received
	 * @returns The query checked
	 */
	private getQueryMethod(msg: IncomingMessage): OnDisconnectQueryMethod | "none" {
		if (this.node.config.queryType === "none") return "none";

		const query = this.node.config.queryType === "msg" ? msg.method : this.node.config.queryType;
		return this.checkQueryMethod(query);
	}

	/**
	 * Sends a message when events `Firebase:connected` and `Firebase:disconnect` are triggered. Called by `setMsgSendHandler`.
	 * @param event The event that sets the properties of the message sends.
	 */
	private sendMsgOnEvent(event: SendMsgEvent): void {
		try {
			if (!this.node.database) return;

			const msg2Send: OnDisconnectMessage = {
				payload: Date.now(),
				event: event,
				topic: this.node.database.client?.app?.options.databaseURL || "UNKNOW",
			};

			const useSecondOutput = this.node.config.sendMsgEvent === "onConnected,onDisconnect" && event === "disconnect";

			this.node.send(useSecondOutput ? [null, msg2Send] : msg2Send);
		} catch (error) {
			this.node.error(error);
		}
	}

	/**
	 * Subscribes to defined events that will send a payload (`Firebase:connected`, `Firebase:disconnect` or nothing).
	 * Calls `sendMsgOnEvent` to send the message.
	 */
	public setMsgSendHandler(): void {
		const events = this.node.config.sendMsgEvent?.split(",");
		if (!events) return;

		if (events.includes("onConnected")) this.rtdb?.on("connected", this.sendMsgOnConnected);
		if (events.includes("onDisconnect")) this.rtdb?.on("disconnect", this.sendMsgOnDisconnect);
	}

	/**
	 * Sets the node status to "Query Done!" for 500ms.
	 */
	private setNodeQueryDone(): void {
		this.setStatus("Query Done");
		setTimeout(() => this.setStatus(), 500);
	}

	/**
	 * Defines the query to run when the client disconnects. Calls `setNodeQueryDone` to set the "Query Done!" node status
	 * when the query is done.
	 * @param msg The message received
	 * @returns A promise that resolves when the query is done
	 */
	public mofifyOnDisconnect(msg: IncomingMessage, done: (error?: Error) => void): void {
		(async () => {
			try {
				const query = this.getQueryMethod(msg);
				const payload = this.evaluatePayloadForServerValue(msg.payload);

				if (!this.rtdb) return;
				if (query === "none") return Promise.resolve();

				const path = this.getPath(msg);

				if (!(await this.node.database?.clientSignedIn())) return Promise.resolve();

				switch (query) {
					case "cancel":
					case "remove":
						await this.rtdb.modifyOnDisconnect(query, path);
						break;
					case "set":
						await this.rtdb.modifyOnDisconnect(query, path, payload);
						break;
					case "update":
						if (payload && typeof payload === "object") {
							await this.rtdb.modifyOnDisconnect(query, path, payload);
							break;
						}

						throw new Error("msg.payload must be an object with 'update' query.");
					case "setWithPriority":
						await this.rtdb.modifyOnDisconnect(query, path, payload, this.getPriority(msg));
						break;
				}

				this.setNodeQueryDone();

				// Clear Permission Denied Status
				if (this.permissionDeniedStatus) {
					this.permissionDeniedStatus = false;
				}

				done();
			} catch (error) {
				this.onError(error, done);
			}
		})();
	}
}
