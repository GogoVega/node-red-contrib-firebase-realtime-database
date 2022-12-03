function initApp(self) {
	const { initializeApp } = require("firebase/app");

	try {
		self.app = initializeApp({
			apiKey: self.credentials.apiKey,
			databaseURL: self.credentials.url,
		});
	} catch (error) {
		self.onError(error);
	}
}

function initAppWithSDK(self) {
	const { cert, initializeApp } = require("firebase-admin/app");

	try {
		const content = JSON.parse(self.credentials.json);
		self.app = initializeApp({
			credential: cert(content),
			databaseURL: self.credentials.url,
		});
	} catch (error) {
		self.onError(error);
	}
}

// TODO: Add other authentication methods
async function logIn(self) {
	switch (self.config.authType) {
		case "anonymous":
			await logInAnonymously(self);
			break;
		case "privateKey":
			// TODO: find a way to know the connection status
			logInWithPrivateKey(self).then(() => setNodesConnected(self));
			break;
		case "email":
			await logInWithEmail(self);
			break;
	}
}

async function logInAnonymously(self) {
	const { getAuth, signInAnonymously } = require("firebase/auth");
	const { getDatabase } = require("firebase/database");

	initApp(self);
	self.auth = getAuth(self.app);
	self.db = getDatabase(self.app);
	await signInAnonymously(self.auth)
		.then(() => setNodesConnected(self))
		.catch((error) => self.onError(error));
}

async function logInWithEmail(self) {
	const {
		createUserWithEmailAndPassword,
		fetchSignInMethodsForEmail,
		getAuth,
		signInWithEmailAndPassword,
	} = require("firebase/auth");
	const { getDatabase } = require("firebase/database");

	initApp(self);
	self.auth = getAuth(self.app);
	self.db = getDatabase(self.app);

	try {
		// Checks if the user already has an account otherwise it creates one
		const method = await fetchSignInMethodsForEmail(self.auth, self.credentials.email);

		if (method.length === 0) {
			await createUserWithEmailAndPassword(self.auth, self.credentials.email, self.credentials.password)
				.then(() => setNodesConnected(self))
				.catch((error) => self.onError(error));

			self.warn(
				`The user "${self.credentials.email}" has been successfully created. You can delete it in the Authenticate section if it is an error.`
			);
		} else if (method.includes("password")) {
			await signInWithEmailAndPassword(self.auth, self.credentials.email, self.credentials.password)
				.then(() => setNodesConnected(self))
				.catch((error) => self.onError(error));
		} //else if (method.includes("link")) {}
	} catch (error) {
		self.onError(error);
	}
}

async function logInWithPrivateKey(self) {
	const { getDatabase } = require("firebase-admin/database");
	initAppWithSDK(self);
	self.db = getDatabase(self.app);
}

async function logOut(self) {
	const { deleteApp } = require("firebase/app");
	const firebaseAdmin = require("firebase-admin/app");

	if (!self.app) return;

	await signOut(self);

	if (self.config.authType === "privateKey") {
		await firebaseAdmin.deleteApp(self.app).catch((error) => self.onError(error));
	} else {
		await deleteApp(self.app).catch((error) => self.onError(error));
	}
}

function setNodesConnected(self) {
	self.connected = true;
	for (const node of self.nodes) {
		node.status({ fill: "green", shape: "dot", text: "connected" });
	}
}

function setNodesDisconnected(self) {
	self.connected = false;
	for (const node of self.nodes) {
		node.status({ fill: "red", shape: "dot", text: "disconnected" });
	}
}

async function signOut(self) {
	const { signOut } = require("firebase/auth");

	if (!self.auth) return;
	if (self.config.authType === "privateKey") return;

	await signOut(self.auth).catch((error) => self.onError(error));
}

module.exports = { logIn, logOut, setNodesConnected, setNodesDisconnected };
