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

export default class FirebaseDatabase {
	constructor(private node: DatabaseNodeType) {}

	private admin = this.node.config.authType === "privateKey";
	private timeoutID: ReturnType<typeof setTimeout> | undefined;

	private checkJSONCredential(content: unknown) {
		if (!content || typeof content !== "object" || !Object.keys(content).length)
			throw new Error("JSON Content must contain 'projectId', 'clientEmail' and 'privateKey'");

		const cred = content as Record<string, string>;

		if (!cred["project_id"] && !cred["projectId"]) throw new Error("JSON Content must contain 'projectId'");
		if (!cred["client_email"] && !cred["clientEmail"]) throw new Error("JSON Content must contain 'clientEmail'");
		if (!cred["private_key"] && !cred["privateKey"]) throw new Error("JSON Content must contain 'privateKey'");

		return content as JSONContentType;
	}

	private getJSONCredential() {
		const content = JSON.parse(this.node.credentials.json || "{}");
		return this.checkJSONCredential(content);
	}

	private initApp() {
		this.node.app = initializeApp({
			apiKey: this.node.credentials.apiKey,
			databaseURL: this.node.credentials.url,
		});

		this.node.auth = getAuth(this.node.app as FirebaseApp);
		this.node.database = getDatabase(this.node.app as FirebaseApp);
	}

	private initAppWithSDK() {
		const content = this.getJSONCredential();

		this.node.app = admin.initializeApp({
			credential: admin.credential.cert(content),
			databaseURL: this.node.credentials.url,
		});

		this.node.database = admin.database(this.node.app as admin.app.App);
	}

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

	private initLogging() {
		// Get warning message from bad database url configured
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

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	private isAdmin(db: Database | admin.database.Database): db is admin.database.Database {
		return this.node.config.authType === "privateKey";
	}

	private isFirebaseError(error: unknown): error is FirebaseError {
		return error instanceof FirebaseError || Object.prototype.hasOwnProperty.call(error, "code");
	}

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
	}

	private logInAnonymously() {
		if (!this.node.auth) return;

		return signInAnonymously(this.node.auth as Auth);
	}

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

	public async logOut() {
		if (!this.node.app) return;

		this.node.log(`Closing connection with Firebase database: ${this.node.app?.options.databaseURL}`);

		if (this.node.database) off(ref(this.node.database as Database, ".info/connected"), "value");

		await this.signOut();

		if (this.admin) {
			return admin.app().delete();
		} else {
			return deleteApp(this.node.app as FirebaseApp);
		}
	}

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

	public setNodesConnected() {
		this.node.connectionStatus = ConnectionStatus.CONNECTED;

		for (const node of this.node.nodes) {
			node.status({ fill: "green", shape: "dot", text: "Connected" });
		}
	}

	public setNodesConnecting() {
		this.node.connectionStatus = ConnectionStatus.CONNECTING;

		for (const node of this.node.nodes) {
			node.status({ fill: "yellow", shape: "ring", text: "Connecting" });
		}
	}

	public setNodesDisconnected() {
		if (this.node.connectionStatus === ConnectionStatus.ERROR) return;

		this.node.connectionStatus = ConnectionStatus.DISCONNECTED;

		for (const node of this.node.nodes) {
			node.status({ fill: "red", shape: "dot", text: "Disconnected" });
		}
	}

	public setNodesError(msg?: string) {
		this.node.connectionStatus = ConnectionStatus.ERROR;

		for (const node of this.node.nodes) {
			node.status({ fill: "red", shape: "dot", text: `Error${msg ? ": ".concat(msg) : ""}` });
		}
	}

	public setNodesNoNetwork() {
		this.node.connectionStatus = ConnectionStatus.NO_NETWORK;

		for (const node of this.node.nodes) {
			node.status({ fill: "red", shape: "ring", text: "No Network" });
		}
	}

	private signOut() {
		if (this.admin || !this.node.auth) return Promise.resolve();

		return signOut(this.node.auth as Auth);
	}
}
