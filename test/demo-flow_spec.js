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

const GH_BRANCH_REF = (process.env.BRANCH_REF || "").replace(/\//g, "-");
const PATH_BASE_REF = `github-workflow/${GH_BRANCH_REF}/${process.version.split(".")[0]}/`;

const knownTypes = [
	"firebase-in",
	"firebase-get",
	"firebase-out",
	"firebase-config",
	"on-disconnect",
	"inject",
	"debug",
];
const flow = require("../examples/demo-flow.json")
	.filter((node) => knownTypes.includes(node.type))
	.map((node) => {
		if (node.type === "inject" && node.topic) {
			// Update the path to allow parallel unit tests
			node.topic = PATH_BASE_REF + node.topic;
		} else if (node.type === "debug") {
			// To attach should to the node
			node.type = "helper";
		} else if (node.type === "firebase-config") {
			// To force anonymous as auth method
			node.authType = "anonymous";
		} else if (node.type.startsWith("firebase-")) {
			if (node.pathType === "str") {
				// Update the path to allow parallel unit tests
				node.path = PATH_BASE_REF + node.path;
			}
		}
		return node;
	});

const helper = require("node-red-node-test-helper");
const nodes = [
	require("@gogovega/firebase-config-node"),
	require("../build/nodes/firebase-in"),
	require("../build/nodes/firebase-get"),
	require("../build/nodes/firebase-out"),
	require("@node-red/nodes/core/common/20-inject.js"),
];

const creds = {
	apiKey: process.env.API_KEY,
	url: process.env.RTDB_URL,
};

const { Firebase } = require("../build/lib/firebase-node");

Firebase.configNodeSatisfiesVersion = true;

describe("Demo Flow tests", function () {
	before(function (done) {
		helper.startServer(done);
	});

	after(function (done) {
		helper.stopServer(done);
	});

	afterEach(async function () {
		await helper.unload();
	});

	context("Play with timestamp", () => {
		it("should have set a timestamp", function (done) {
			helper.load(nodes, flow, { e8796a1869e179bc: creds }, function () {
				setTimeout(() => {
					const inject = helper.getNode("5792767043952f56");
					const debug = helper.getNode("15d852f4a29abec1");
					const timestamp = Date.now();

					debug.on("input", function (msg) {
						try {
							msg.should.have.property("payload");
							msg.payload.should.be.Number();
							// TODO: why this diff?
							Math.abs(msg.payload - timestamp).should.be.belowOrEqual(10);
							done();
						} catch (error) {
							done(error);
						}
					});

					inject.receive({ payload: timestamp });
				}, 1500);
			});
		});

		it("should have push several timestamps to the list", function (done) {
			helper.load(nodes, flow, { e8796a1869e179bc: creds }, async function () {
				const configNode = helper.getNode("e8796a1869e179bc");

				await configNode.clientSignedIn();
				await configNode.rtdb?.modify("remove", PATH_BASE_REF + "timestampList");
				setTimeout(() => {
					const inject = helper.getNode("ab41c49f03bf8362");
					const debug = helper.getNode("7ae6239a6e476d5f");

					let count = 1;
					debug.on("input", function (msg) {
						try {
							msg.should.have.property("payload");
							msg.payload.should.be.Object();
							Object.values(msg.payload).length.should.equal(count);
							Object.values(msg.payload).forEach((t) => t.should.be.Number());
							count++;
							if (count > 5) setTimeout(done, 1500);
						} catch (error) {
							done(error);
						}
					});

					for (let i = 0; i < 5; i++) {
						inject.receive();
					}
				}, 1500);
			});
		});
	});

	context("Play with users", () => {
		it("should have deleted users", function (done) {
			helper.load(nodes, flow, { e8796a1869e179bc: creds }, async function () {
				const configNode = helper.getNode("e8796a1869e179bc");

				await configNode.clientSignedIn();
				await configNode.rtdb?.modify("remove", PATH_BASE_REF + "users");
				setTimeout(() => {
					const inject = helper.getNode("ca1a112e5c6cbdb2");
					const debug = helper.getNode("9acbf29beeba99c3");

					debug.on("input", function (msg) {
						try {
							msg.should.have.property("payload", null);
							setTimeout(done, 1500);
						} catch (error) {
							done(error);
						}
					});

					inject.receive();
				}, 1500);
			});
		});

		it("should have added Alan", function (done) {
			helper.load(nodes, flow, { e8796a1869e179bc: creds }, function () {
				setTimeout(() => {
					const inject = helper.getNode("7376db537268899b");
					const debug = helper.getNode("29aaf3383098e09e");

					debug.on("input", function (msg) {
						try {
							msg.should.have.property("payload", {
								full_name: "Alan Turing",
								nickname: "Alan The Machine",
								date_of_birth: "June 23, 1912",
							});
							msg.should.have.property("topic", "alanisawesome");
							setTimeout(done, 1500);
						} catch (error) {
							done(error);
						}
					});

					inject.receive();
				}, 1500);
			});
		});

		it("should have added Steve", function (done) {
			helper.load(nodes, flow, { e8796a1869e179bc: creds }, function () {
				setTimeout(() => {
					const inject = helper.getNode("bd18e498f7c61507");
					const debug = helper.getNode("ee3a2b0bc367a47e");

					debug.on("input", function (msg) {
						try {
							msg.should.have.property("payload", {
								alanisawesome: {
									full_name: "Alan Turing",
									nickname: "Alan The Machine",
									date_of_birth: "June 23, 1912",
								},
								steveisapple: { full_name: "Steve Jobs", hobby: "Computer", nickname: "Steve The King" },
							});
							msg.should.have.property("topic", "users");
							setTimeout(done, 1500);
						} catch (error) {
							done(error);
						}
					});

					inject.receive();
				}, 1500);
			});
		});

		it("should have modified Alan nickname", function (done) {
			helper.load(nodes, flow, { e8796a1869e179bc: creds }, function () {
				setTimeout(() => {
					const inject = helper.getNode("19355c55dc280ad7");
					const debug = helper.getNode("735b562a594841f3");

					debug.on("input", function (msg) {
						try {
							msg.should.have.property("payload", {
								full_name: "Alan Turing",
								nickname: "Alan is Genius",
								date_of_birth: "June 23, 1912",
							});
							msg.should.have.property("topic", "alanisawesome");
							setTimeout(done, 1500);
						} catch (error) {
							done(error);
						}
					});

					inject.receive();
				}, 1500);
			});
		});

		/*it("should have removed Alan nickname", function (done) {
			helper.load(nodes, flow, { e8796a1869e179bc: creds }, function () {
				setTimeout(() => {
					const inject = helper.getNode("1addc1cfbb75e991");
					const debug = helper.getNode("735b562a594841f3");

					debug.on("input", function (msg) {
						try {
							msg.should.have.property("payload", { full_name: "Alan Turing", date_of_birth: "June 23, 1912" });
							msg.should.have.property("topic", "alanisawesome");
							setTimeout(done, 1500);
						} catch (error) {
							done(error);
						}
					});

					inject.receive();
				}, 1500);
			});
		});*/

		it("should have removed Alan", function (done) {
			helper.load(nodes, flow, { e8796a1869e179bc: creds }, function () {
				setTimeout(() => {
					const inject = helper.getNode("0ef7c0721cf81927");
					const debug = helper.getNode("6a90881898ed3551");

					debug.on("input", function (msg) {
						try {
							msg.should.have.property("payload", {
								full_name: "Alan Turing",
								date_of_birth: "June 23, 1912",
								nickname: "Alan is Genius",
							});
							msg.should.have.property("topic", "alanisawesome");
							setTimeout(done, 1500);
						} catch (error) {
							done(error);
						}
					});

					inject.receive();
				}, 1500);
			});
		});
	});

	context("Play with reserved keywords", () => {
		it("should have set the index to 1", function (done) {
			helper.load(nodes, flow, { e8796a1869e179bc: creds }, async function () {
				const configNode = helper.getNode("e8796a1869e179bc");

				await configNode.clientSignedIn();
				await configNode.rtdb?.modify("set", PATH_BASE_REF + "index", 0);

				setTimeout(() => {
					const inject = helper.getNode("5395c1e6288eedd1");
					const debug = helper.getNode("e8373909bb49fb32");

					debug.on("input", function (msg) {
						try {
							msg.should.have.property("payload", 1);
							msg.should.have.property("topic", "index");
							setTimeout(done, 1500);
						} catch (error) {
							done(error);
						}
					});

					inject.receive();
				}, 1500);
			});
		});

		it("should have increased the index to 5", function (done) {
			helper.load(nodes, flow, { e8796a1869e179bc: creds }, function () {
				setTimeout(() => {
					const inject = helper.getNode("a946387bbf0e9716");
					const debug = helper.getNode("e8373909bb49fb32");

					let count = 2;
					debug.on("input", function (msg) {
						try {
							msg.should.have.property("payload", count);
							msg.should.have.property("topic", "index");
							count++;
							if (count > 6) setTimeout(done, 1500);
						} catch (error) {
							done(error);
						}
					});

					for (let i = 0; i < 5; i++) {
						inject.receive();
					}
				}, 1500);
			});
		});

		it("should have decreased the index to 0", function (done) {
			helper.load(nodes, flow, { e8796a1869e179bc: creds }, function () {
				setTimeout(() => {
					const inject = helper.getNode("909e56335c63fd16");
					const debug = helper.getNode("e8373909bb49fb32");

					let count = 5;
					debug.on("input", function (msg) {
						try {
							msg.should.have.property("payload", count);
							msg.should.have.property("topic", "index");
							count--;
							if (count < 0) done();
						} catch (error) {
							done(error);
						}
					});

					for (let i = 0; i < 6; i++) {
						inject.receive();
					}
				}, 1500);
			});
		});
	});
});
