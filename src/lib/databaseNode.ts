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

import { deleteApp, FirebaseApp, FirebaseError, initializeApp, onLog } from "firebase/app";
import {
	Auth,
	createUserWithEmailAndPassword,
	fetchSignInMethodsForEmail,
	getAuth,
	signInAnonymously,
	signInWithEmailAndPassword,
	signOut,
} from "firebase/auth";
import { Database, getDatabase, off, onValue, ref } from "firebase/database";
import admin from "firebase-admin";
import { firebaseError } from "./const/FirebaseError";
import { ConnectionStatus, DatabaseNodeType, JSONContentType } from "./types/DatabaseNodeType";

/**
 * FirebaseDatabase Class
 *
 * This class is used to communicate with Google Firebase Realtime Databases.
 *
 * The modules used are `firebase` and `firebase-admin`.
 *
 * The Authentication Methods are:
 * - Anonymous
 * - Email and Password
 * - Private Key (SDK Admin)
 *
 * @param node The `config-node` to associate with this class
 * @returns A FirebaseDatabase Class
 */
export default class FirebaseDatabase {
	constructor(private node: DatabaseNodeType) {
		node.destroyUnusedConnection = this.destroyUnusedConnection.bind(this);
		node.restoreDestroyedConnection = this.restoreDestroyedConnection.bind(this);
	}

	/**
	 * This property is true if the authentication method used uses the `firebase-admin` module.
	 */
	private admin = this.node.config.authType === "privateKey";

	/**
	 * This property contains the identifier of the timer used to check if the config-node is unused
	 * and will be used to clear the timeout in case at least one node is linked to this database.
	 */
	private destructionTimeouID: ReturnType<typeof setTimeout> | undefined;

	/**
	 * This property contains the identifier of the timer used to define the status of the nodes linked
	 * to this database as being `disconnected` and will be used to clear the timeout.
	 */
	private timeoutID: ReturnType<typeof setTimeout> | undefined;

	/**
	 * Check if the received JSON content credentials contain the desired elements.
	 * @param content The JSON content credentials
	 * @returns The JSON content credentials checked
	 */
	private checkJSONCredential(content: unknown): JSONContentType {
		if (!content || typeof content !== "object" || !Object.keys(content).length)
			throw new Error("JSON Content must contain 'projectId', 'clientEmail' and 'privateKey'");

		const cred = content as Record<string, string>;

		if (!cred["project_id"] && !cred["projectId"]) throw new Error("JSON Content must contain 'projectId'");
		if (!cred["client_email"] && !cred["clientEmail"]) throw new Error("JSON Content must contain 'clientEmail'");
		if (!cred["private_key"] && !cred["privateKey"]) throw new Error("JSON Content must contain 'privateKey'");

		return content as JSONContentType;
	}

	/**
	 * Creates and initializes a callback to verify that the config node is in use.
	 * Otherwise the connection with Firebase will be closed.
	 * @note Use of a timer is essential because it's necessary to allow time for all nodes to start before checking
	 * the number of nodes connected to this database.
	 * @param removed A flag that indicates whether the node is being closed because it has been removed entirely,
	 * or that it is just being restarted.
	 * If `true`, execute the callback after 15s otherwise skip it.
	 */
	private destroyUnusedConnection(removed: boolean) {
		if (!removed || this.node.nodes.length > 0) return;

		this.destructionTimeouID = setTimeout(() => {
			this.node.warn(
				`WARNING: '${this.node.config.name}' config node is unused! The connection with Firebase will be closed.`
			);

			this.logOut()
				.then(() => this.node.log("Connection with Firebase was closed because no node used."))
				.catch((error) => this.node.error(error));
		}, 15000);
	}

	/**
	 * Get credentials from JSON content of `config-node`.
	 * @returns The JSON content credentials
	 */
	private getJSONCredential() {
		const content = JSON.parse(this.node.credentials.json || "{}");

		if (Object.keys(content).length === 0) {
			const projetId = this.node.credentials.url
				.split("https://")
				.pop()
				?.split(/-default-rtdb\.((asia-southeast1|europe-west1)\.firebasedatabase\.app|firebaseio\.com)(\/)?$/)[0];
			const privateKey = JSON.stringify(this.node.credentials.privateKey)
				.replace(/\\\\n/gm, "\n")
				.replaceAll('"', "")
				.replaceAll("\\", "");

			content["project_id"] = projetId;
			content["clientEmail"] = this.node.credentials.clientEmail;
			content["privateKey"] = privateKey;
		}

		return this.checkJSONCredential(content);
	}

	/**
	 * Creates and initializes a `@firebase/FirebaseApp` and `@firebase/Database` instance.
	 */
	private initApp() {
		this.node.app = initializeApp({
			apiKey: this.node.credentials.apiKey,
			databaseURL: this.node.credentials.url,
		});

		this.node.auth = getAuth(this.node.app as FirebaseApp);
		this.node.database = getDatabase(this.node.app as FirebaseApp);
	}

	/**
	 * Creates and initializes a `@firebase-admin/FirebaseApp` and `@firebase-admin/Database` instance.
	 */
	private initAppWithSDK() {
		const content = this.getJSONCredential();

		this.node.app = admin.initializeApp({
			credential: admin.credential.cert(content),
			databaseURL: this.node.credentials.url,
		});

		this.node.database = admin.database(this.node.app as admin.app.App);
	}

	/**
	 * Creates and initializes a listener to display the connection status with Firebase on nodes linked
	 * to this database.
	 */
	private initConnectionStatus() {
		if (!this.node.database) return;

		onValue(
			ref(this.node.database as Database, ".info/connected"),
			(snapshot) => {
				if (snapshot.val() === true) {
					// Clear timeout for setNodesDisconnected
					if (this.timeoutID) {
						clearTimeout(this.timeoutID);
						this.timeoutID = undefined;
					}

					this.setNodesConnected();
					this.node.log(`Connected to Firebase database: ${this.node.app?.options.databaseURL}`);
				} else {
					this.setNodesConnecting();
					// Based on maximum time for Firebase admin
					this.timeoutID = setTimeout(() => this.setNodesDisconnected(), 30000);
					this.node.log(`Connecting to Firebase database: ${this.node.app?.options.databaseURL}`);
				}
			},
			(error) => this.node.error(error)
		);
	}

	/**
	 * Creates and initializes a logging to get warning message from bad database url configured and invalid credentials
	 * in order to make it an error message.
	 */
	private initLogging() {
		// Works for both databases
		onLog(
			(log) => {
				if (log.message.includes("URL of your Firebase Realtime Database instance configured correctly"))
					return this.onError(new FirebaseError("auth/invalid-database-url", ""));
				if (log.message.includes("app/invalid-credential"))
					return this.onError(new FirebaseError("auth/invalid-credential", ""));
			},
			{ level: "warn" }
		);
	}

	/**
	 * This method checks if the database uses the `firebase-admin` module.
	 * @param db The database used
	 * @returns `true` if the database uses the `firebase-admin` module.
	 */
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	private isAdmin(db: Database | admin.database.Database): db is admin.database.Database {
		return this.node.config.authType === "privateKey";
	}

	/**
	 * This method checks if the error is instance of FirebaseError.
	 * @param error The error received
	 * @returns `true` if the error is instance of FirebaseError
	 */
	private isFirebaseError(error: unknown): error is FirebaseError {
		return error instanceof FirebaseError || Object.prototype.hasOwnProperty.call(error, "code");
	}

	/**
	 * Connects to Firebase with the authentication method defined in the `config-node`
	 * @return A promise for Firebase connection completion
	 */
	public async logIn() {
		// Initialize Logging
		this.initLogging();

		// Initialize App
		this.admin ? this.initAppWithSDK() : this.initApp();

		// Initialize Connection Status
		this.initConnectionStatus();

		// Log In
		switch (this.node.config.authType) {
			case "anonymous":
				await this.logInAnonymously();
				break;
			case "email":
				await this.logInWithEmail();
				break;
			case "privateKey":
				// Logged In with Initialize App
				break;
		}

		// Check if the config node is in use. Otherwise the connection with Firebase will be closed.
		this.destroyUnusedConnection(true);
	}

	/**
	 * Logs in as an anonymous user.
	 * @returns A promise of signing completion
	 */
	private logInAnonymously() {
		if (!this.node.auth) return;

		return signInAnonymously(this.node.auth as Auth);
	}

	/**
	 * Logs in using an email and password.
	 * @remarks An option allows to create or not a new user and will send a warning message when creating a new user.
	 * @returns A promise of signing completion
	 */
	private async logInWithEmail() {
		if (!this.node.auth) return;

		// Checks if the user already has an account otherwise it creates one
		const method = await fetchSignInMethodsForEmail(this.node.auth as Auth, this.node.credentials.email);

		if (method.length === 0 && this.node.config.createUser) {
			await createUserWithEmailAndPassword(
				this.node.auth as Auth,
				this.node.credentials.email,
				this.node.credentials.password
			);

			this.node.warn(
				`The user "${this.node.credentials.email}" has been successfully created. You can delete it in the Authenticate section if it is an error.`
			);
		} else if (method.includes("password")) {
			await signInWithEmailAndPassword(
				this.node.auth as Auth,
				this.node.credentials.email,
				this.node.credentials.password
			);
			// TODO: to see... else if (method.includes("link")) {}
		} else {
			throw new FirebaseError("auth/unknown-email", "");
		}
	}

	/**
	 * Disconnects from Firebase.
	 * @returns A promise for Firebase disconnection completion
	 */
	public async logOut() {
		if (!this.node.app) return;

		// If Node-RED is restarted, stop the timeout (avoid double logout request)
		clearTimeout(this.destructionTimeouID);
		this.node.connectionStatus = ConnectionStatus.LOG_OUT;
		this.node.log(`Closing connection with Firebase database: ${this.node.app?.options.databaseURL}`);

		if (this.node.database) off(ref(this.node.database as Database, ".info/connected"), "value");

		await this.signOut();

		if (this.admin) {
			return admin.app().delete();
		} else {
			return deleteApp(this.node.app as FirebaseApp);
		}
	}

	/**
	 * A custom method in case of error allowing to send a predefined error message if this error is known
	 * otherwise returns the message as it is.
	 * @param error The error received
	 * @param done If defined this callback will return the error message
	 */
	public onError(error: Error | FirebaseError, done?: (error?: unknown) => void) {
		let msg = error.message || error.toString();

		if (this.isFirebaseError(error)) {
			msg = firebaseError[error.code.split(".")[0]];
			// Not working for firebase-admin...
			if (error.code.match(/auth\/network-request-failed/)) {
				this.setNodesNoNetwork();
			} else if (error.code.startsWith("auth/")) {
				this.setNodesError(error.code.split("auth/").pop()?.split(".")[0].replace(/-/gm, " ").toPascalCase());
			} else {
				this.setNodesError();
			}
		} else {
			this.setNodesError();
		}

		msg = msg || error.message || error.toString();

		if (done) return done(msg);

		this.node.error(msg);
	}

	/**
	 * Restores the connection with Firebase if at least one node is activated.
	 * @remarks This method should only be used if the connection has been destroyed.
	 */
	private restoreDestroyedConnection() {
		if (this.node.nodes.length > 1) return;

		// If a node is started, stop the timeout
		clearTimeout(this.destructionTimeouID);
		this.destructionTimeouID = undefined;

		// Skip if Node-RED re-starts
		if (this.node.connectionStatus !== ConnectionStatus.LOG_OUT) return;

		(async () => {
			try {
				await this.logIn();
			} catch (error) {
				this.node.error(error);
			}
		})();
	}

	/**
	 * Sets the status of nodes linked to this database as `Connected`.
	 */
	public setNodesConnected() {
		this.node.connectionStatus = ConnectionStatus.CONNECTED;

		for (const node of this.node.nodes) {
			node.status({ fill: "green", shape: "dot", text: "Connected" });
		}
	}

	/**
	 * Sets the status of nodes linked to this database as `Connecting`.
	 */
	public setNodesConnecting() {
		this.node.connectionStatus = ConnectionStatus.CONNECTING;

		for (const node of this.node.nodes) {
			node.status({ fill: "yellow", shape: "ring", text: "Connecting" });
		}
	}

	/**
	 * Sets the status of nodes linked to this database as `Disconnected`.
	 */
	public setNodesDisconnected() {
		if (this.node.connectionStatus === ConnectionStatus.ERROR) return;

		this.node.connectionStatus = ConnectionStatus.DISCONNECTED;

		for (const node of this.node.nodes) {
			node.status({ fill: "red", shape: "dot", text: "Disconnected" });
		}
	}

	/**
	 * Sets the status of nodes linked to this database as `Error`. An error code can also be set.
	 * @param code The error code to add to the status
	 */
	public setNodesError(code?: string) {
		this.node.connectionStatus = ConnectionStatus.ERROR;

		for (const node of this.node.nodes) {
			node.status({ fill: "red", shape: "dot", text: `Error${code ? ": ".concat(code) : ""}` });
		}
	}

	/**
	 * Sets the status of nodes linked to this database as `No Network`.
	 */
	public setNodesNoNetwork() {
		this.node.connectionStatus = ConnectionStatus.NO_NETWORK;

		for (const node of this.node.nodes) {
			node.status({ fill: "red", shape: "ring", text: "No Network" });
		}
	}

	/**
	 * Signs out from Firebase.
	 * @returns A promise for signout completion
	 */
	private signOut() {
		if (this.admin || !this.node.auth) return Promise.resolve();

		return signOut(this.node.auth as Auth);
	}
}
