import { deleteApp, FirebaseApp, initializeApp, onLog } from "firebase/app";
import {
  Auth,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  getAuth, 
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { Database, getDatabase, onValue, ref } from "firebase/database";
import admin from "firebase-admin";
import { DatabaseNodeType, JSONContentType } from "./types/DatabaseNodeType";

export default class FirebaseDatabase {
  constructor(private node: DatabaseNodeType) { }

  private initApp() {
    // Get warning message from bad database url configured
    onLog((log) => this.node.warn(log.message), { level: "warn" });

    this.node.app = initializeApp({
      apiKey: this.node.credentials.apiKey,
      databaseURL: this.node.credentials.url,
    });

    this.node.auth = getAuth(this.node.app as FirebaseApp);
    this.node.database = getDatabase(this.node.app as FirebaseApp);
  }

  private initAppWithSDK() {
    const content = JSON.parse(this.node.credentials.json || "{}");

    const isContentNotValid = this.isJSONContentValid(content);

    if (isContentNotValid) throw new Error(isContentNotValid);

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
          this.setNodesConnected();
          this.node.log(`Connected to Firebase database: ${this.node.app?.options.databaseURL}`);
        } else {
          this.setNodesConnecting();
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

    this.initConnectionStatus();
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
      await createUserWithEmailAndPassword(this.node.auth as Auth, this.node.credentials.email, this.node.credentials.password);

      this.node.warn(
        `The user "${this.node.credentials.email}" has been successfully created. You can delete it in the Authenticate section if it is an error.`
      );
    } else if (method.includes("password")) {
      await signInWithEmailAndPassword(this.node.auth as Auth, this.node.credentials.email, this.node.credentials.password);
      // TODO: to see... else if (method.includes("link")) {}
    } else {
      throw new Error("auth/email-not-valid");
    }
  }

  private logInWithPrivateKey() {
    this.initAppWithSDK();
  }

  public async logOut() {
    if (!this.node.app) return;

    this.node.log(`Closing connection with Firebase database: ${this.node.app?.options.databaseURL}`);

    await this.signOut();

    if (this.node.config.authType === "privateKey") {
      await admin.app().delete();
    } else {
      await deleteApp(this.node.app as FirebaseApp);
    }
  }

  public parseErrorMsg(error: Error) {
    const msg = error.message || error.toString();
    if (msg.includes("auth/internal-error")) return "Please check your email address and password";
    if (msg.includes("auth/api-key-not-valid")) return "Please check your API key";
    if (msg.includes("auth/email-not-valid")) return "Please check your email address or select 'create a new user'";
    return msg;
  }
  
  public setNodesConnected() {
    this.node.connected = true;
    for (const node of this.node.nodes) {
      node.status({ fill: "green", shape: "dot", text: "connected" });
    }
  }
  
  public setNodesConnecting() {
    this.node.connected = false;
    for (const node of this.node.nodes) {
      node.status({ fill: "yellow", shape: "ring", text: "connecting" });
    }
  }
  
  public setNodesDisconnected() {
    this.node.connected = false;
    for (const node of this.node.nodes) {
      node.status({ fill: "red", shape: "dot", text: "disconnected" });
    }
  }
  
  private async signOut() {
    if (!this.node.auth) return;
    if (this.node.config.authType === "privateKey") return;
  
    await signOut(this.node.auth as Auth);
  }
}
