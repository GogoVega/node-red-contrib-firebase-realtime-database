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

	private timeoutID: ReturnType<typeof setTimeout> | undefined;

	private initApp() {
		// Get warning message from bad database url configured
		// TODO: add filter
		onLog(
			(log) => {
				if (!log.message.match(/(URL of your Firebase Realtime Database instance configured correctly)/gm)) return;
				this.onError(new FirebaseError("auth/invalid-database-url", ""));
			},
			{ level: "warn" }
		);

		this.node.app = initializeApp({
			apiKey: this.node.credentials.apiKey,
			databaseURL: this.node.credentials.url,
		});

		this.node.auth = getAuth(this.node.app as FirebaseApp);
		this.node.database = getDatabase(this.node.app as FirebaseApp);
		this.initConnectionStatus();
	}

	private initAppWithSDK() {
		// TODO
		//admin.database.enableLogging((msg) => this.node.warn(msg));

		const content = JSON.parse(this.node.credentials.json || "{}");

		const isContentNotValid = this.isJSONContentValid(content);

		if (isContentNotValid) throw new Error(isContentNotValid);

		this.node.app = admin.initializeApp({
			credential: admin.credential.cert(content),
			databaseURL: this.node.credentials.url,
		});

		this.node.database = admin.database(this.node.app as admin.app.App);
		this.initConnectionStatus();
	}

	private initConnectionStatus() {
		if (!this.node.database) return;

		onValue(
			ref(this.node.database as Database, ".info/connected"),
			(snapshot) => {
				if (snapshot.val() === true) {
					if (this.timeoutID) {
						clearTimeout(this.timeoutID);
						this.timeoutID = undefined;
					}

					this.setNodesConnected();
					this.node.log(`Connected to Firebase database: ${this.node.app?.options.databaseURL}`);
				} else {
					this.setNodesConnecting();
					this.timeoutID = setTimeout(() => this.setNodesDisconnected(), 30000);
					this.node.log(`Connecting to Firebase database: ${this.node.app?.options.databaseURL}`);
				}
			},
			(error) => this.node.error(error)
		);
	}

	private isJSONContentValid(content: JSONContentType) {
		if (Object.keys(content).length === 0) {
			return "JSON Content must contain 'projectId', 'clientEmail' and 'privateKey'";
		} else if (!content["project_id"]) {
			return "JSON Content must contain 'projectId'";
		} else if (!content["client_email"]) {
			return "JSON Content must contain 'clientEmail'";
		} else if (!content["private_key"]) {
			return "JSON Content must contain 'privateKey'";
		}

		return;
	}

	public async logIn() {
		switch (this.node.config.authType) {
			case "anonymous":
				await this.logInAnonymously();
				break;
			case "email":
				await this.logInWithEmail();
				break;
			case "privateKey":
				this.logInWithPrivateKey();
				break;
		}
	}

	private async logInAnonymously() {
		this.initApp();

		if (!this.node.auth) return;

		await signInAnonymously(this.node.auth as Auth);
	}

	private async logInWithEmail() {
		this.initApp();

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

	private logInWithPrivateKey() {
		this.initAppWithSDK();
	}

	public async logOut() {
		if (!this.node.app) return;

		this.node.log(`Closing connection with Firebase database: ${this.node.app?.options.databaseURL}`);

		await this.signOut();

		if (this.node.database) off(ref(this.node.database as Database, ".info/connected"), "value");

		if (this.node.config.authType === "privateKey") {
			await admin.app().delete();
		} else {
			await deleteApp(this.node.app as FirebaseApp);
		}
	}

	private isFirebaseError(error: unknown): error is FirebaseError {
		return error instanceof FirebaseError || Object.prototype.hasOwnProperty.call(error, "code");
	}

	public onError(error: Error | FirebaseError, done?: (error?: unknown) => void) {
		let msg = error.message || error.toString();

		if (this.isFirebaseError(error)) {
			msg = firebaseError[error.code.split(".")[0]];
			if (error.code.match(/auth\/network-request-failed/)) {
				this.setNodesNoNetwork();
			} else if (error.code.startsWith("auth/")) {
				// .substring(0, 32)
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
		if (!this.node.auth) return Promise.resolve();
		if (this.node.config.authType === "privateKey") return Promise.resolve();

		return signOut(this.node.auth as Auth);
	}
}
