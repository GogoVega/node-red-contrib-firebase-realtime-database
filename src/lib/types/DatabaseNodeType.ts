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

import { FirebaseApp } from "firebase/app";
import { Auth } from "firebase/auth";
import { Database } from "firebase/database";
import admin, { ServiceAccount } from "firebase-admin";
import { Node } from "node-red";
import DatabaseConfigType from "./DatabaseConfigType";
import { FirebaseNodeType } from "./FirebaseNodeType";

export enum ConnectionStatus {
	DISCONNECTED,
	CONNECTING,
	CONNECTED,
	LOG_OUT,
	NO_NETWORK,
	ERROR,
}

type DatabaseCredentials = {
	apiKey: string;
	email: string;
	json: string;
	password: string;
	url: string;
	secret: string;
};

type DatabaseNodeType = Node & {
	app?: FirebaseApp | admin.app.App;
	auth?: Auth | admin.auth.Auth;
	config: DatabaseConfigType;
	connectionStatus: ConnectionStatus;
	credentials: DatabaseCredentials;
	database?: Database | admin.database.Database;

	/**
	 * Creates and initializes a callback to verify that the config node is in use.
	 * Otherwise the connection with Firebase will be closed.
	 * @note Use of a timer is essential because it's necessary to allow time for all nodes to start before checking
	 * the number of nodes connected to this database.
	 * @param removed A flag that indicates whether the node is being closed because it has been removed entirely,
	 * or that it is just being restarted.
	 * If `true`, execute the callback after 15s otherwise skip it.
	 */
	destroyUnusedConnection(removed: boolean): void;
	nodes: Array<FirebaseNodeType>;

	/**
	 * Restores the connection with Firebase if at least one node is activated.
	 * @remarks This method should only be used if the connection has been destroyed.
	 */
	restoreDestroyedConnection(): void;
};

type JSONContentType = ServiceAccount & {
	project_id?: string;
	client_email?: string;
	private_key?: string;
};

export { DatabaseNodeType, JSONContentType };
