/**
 * Copyright 2025 Gauthier Dandele
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

const helper = require("node-red-node-test-helper");
const nodes = [
	require("../build/nodes/firebase-in"),
	require("../build/nodes/firebase-get"),
	require("../build/nodes/firebase-out"),
	require("../build/plugins/config-node-checker"),
];

const configNode = require("@gogovega/firebase-config-node");
const configNodeModule = {
	name: "@gogovega/firebase-config-node",
	version: "0.3.1",
	local: true,
	user: false,
	nodes: {
		"firebase-config": {
			name: "firebase-config",
			types: ["firebase-config"],
			enabled: true,
			local: true,
			user: false,
			module: "@gogovega/firebase-config-node",
			file: "build/nodes/firebase-config.js",
		},
	},
};
const flow = [
	{ id: "firebase", type: "firebase-get", database: "database2" },
	{ id: "database2", type: "firebase-config", name: "My Database", authType: "anonymous" },
];

const { Firebase } = require("../build/lib/firebase-node");
const VERSION = require("../package.json").dependencies["@gogovega/firebase-config-node"].substring(1);

process.env.NODE_RED_HOME = process.cwd();

describe("Config Node Checker tests", function () {
	before(function (done) {
		helper.startServer(done);
	});

	after(function (done) {
		helper.stopServer(done);
	});

	afterEach(async function () {
		Firebase.configNodeSatisfiesVersion = false;
		helper.clearModuleList();
		helper.settings({});
		await helper.unload();
	});

	context("When a valid config node is loaded", () => {
		it("should have the correct status", function (done) {
			helper.addModule(configNodeModule);
			helper.load(nodes, flow, function () {
				helper
					.request()
					.get("/firebase/rtdb/config-node/status")
					.expect(200, {
						loadable: true,
						loaded: true,
						version: VERSION,
						versionIsSatisfied: true,
						updateScriptCalled: false,
					})
					.end(done);
			});
		});

		it("should have started the flow", function (done) {
			helper.addModule(configNodeModule);

			let flowStarted = false;
			helper._events.on("flows:started", () => { flowStarted = true });

			helper.load([...nodes, configNode], flow, function () {
				helper
					.request()
					.get("/firebase/rtdb/config-node/status")
					.expect(200, {
						loadable: true,
						loaded: true,
						version: VERSION,
						versionIsSatisfied: true,
						updateScriptCalled: false,
					})
					.end(() => setTimeout(() => {
						flowStarted.should.be.true();
						done();
					}, 100));
			});
		});
	});

	context("When a valid config node is not loaded but loadable", () => {
		it("should have the correct status", function (done) {
			helper.settings({ userDir: process.cwd() });
			helper.load(nodes, flow, function () {
				helper
					.request()
					.get("/firebase/rtdb/config-node/status")
					.expect(200, {
						loadable: true,
						loaded: false,
						version: "0.0.0",
						versionIsSatisfied: false,
						updateScriptCalled: false,
					})
					.end(done);
			});
		});

		it("should have the database not active", function (done) {
			helper.settings({ userDir: process.cwd() });
			helper.load(nodes, flow, function () {
				Firebase.configNodeSatisfiesVersion.should.be.false();
				done();
			});
		});

		it("should load the config node", function (done) {
			const settings = require("../node_modules/@node-red/runtime/lib/settings");
			settings.load({ getSettings: () => Promise.resolve({ _credentialSecret: "00000000000000"}), saveSettings: () => {} })
			helper.settings({ userDir: process.cwd() });
			helper.load(nodes, flow, function () {
				helper
					.request()
					.put("/firebase/rtdb/config-node/scripts")
					.send({ script: "load-config-node" })
					.expect(201)
					.end(() => {
						helper.addModule(configNodeModule);
						helper
							.request()
							.get("/firebase/rtdb/config-node/status")
							.expect(200, {
								loadable: true,
								loaded: true,
								version: VERSION,
								versionIsSatisfied: true,
								updateScriptCalled: false,
							})
							.end(done);
					});
			});
		});

		it("should have started the flow", function (done) {
			const settings = require("../node_modules/@node-red/runtime/lib/settings");
			settings.load({ getSettings: () => Promise.resolve({ _credentialSecret: "00000000000000"}), saveSettings: () => {} })
			helper.settings({ userDir: process.cwd() });

			let flowStarted = false;
			helper._events.on("flows:started", () => { flowStarted = true });

			helper.load(nodes, flow, function () {
				helper
					.request()
					.put("/firebase/rtdb/config-node/scripts")
					.send({ script: "load-config-node" })
					.expect(201)
					.end(() => setTimeout(() => {
						helper.addModule(configNodeModule);
						flowStarted.should.be.true();
						done();
					}, 100));
			});
		});

		// Note: not entirely faithful to reality
		it("should have an active database", function (done) {
			const settings = require("../node_modules/@node-red/runtime/lib/settings");
			settings.load({ getSettings: () => Promise.resolve({ _credentialSecret: "00000000000000"}), saveSettings: () => {} })
			helper.settings({ userDir: process.cwd() });
			helper.load(nodes, flow, function () {
				Firebase.configNodeSatisfiesVersion.should.be.false();
				setTimeout(() => {helper
					.request()
					.put("/firebase/rtdb/config-node/scripts")
					.send({ script: "load-config-node" })
					.expect(201)
					.end(() => setTimeout(() => {
						helper.addModule(configNodeModule);
						Firebase.configNodeSatisfiesVersion.should.be.true();
						const firebaseNode = helper.getNode("firebase");
						firebaseNode.should.have.property("database");
						firebaseNode.database.should.be.Object();
						firebaseNode.database.should.not.be.equal(null);
						done();
					}, 100));
				}, 1000)
			});
		});
	});

	context("When a valid config node is not loaded and unloadable", () => {
		it("should have the correct status", function (done) {
			helper.load(nodes, flow, function () {
				helper
					.request()
					.get("/firebase/rtdb/config-node/status")
					.expect(200, {
						loadable: false,
						loaded: false,
						version: "0.0.0",
						versionIsSatisfied: false,
						updateScriptCalled: false,
					})
					.end(done);
			});
		});
	});

	context("When an invalid config node is loaded", () => {
		it("should have the correct status", function (done) {
			configNodeModule.version = "0.0.1";
			helper.addModule(configNodeModule);
			helper.settings({ userDir: process.cwd() });
			helper.load(nodes, flow, function () {
				helper
					.request()
					.get("/firebase/rtdb/config-node/status")
					.expect(200, {
						loadable: true,
						loaded: true,
						version: "0.0.1",
						versionIsSatisfied: false,
						updateScriptCalled: false,
					})
					.end(done);
			});
		});

		it("should have the database not active", function (done) {
			helper.addModule(configNodeModule);
			helper.settings({ userDir: process.cwd() });
			helper.load([...nodes, configNode], flow, function () {
				helper.getNode("firebase").should.have.property("database", null);
				done();
			});
		});
	});
});
