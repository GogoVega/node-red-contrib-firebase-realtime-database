/**
 * Copyright 2022-2024 Gauthier Dandele
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

const database = require("@gogovega/firebase-config-node");
const helper = require("node-red-node-test-helper");
const flow = [
	{ id: "database", type: "firebase-config", name: "My Database", authType: "anonymous", wires: [["h1"]] },
	{ id: "h1", type: "helper" },
];

const { Firebase } = require("../build/lib/firebase-node");

// TODO: Add more tests
describe("Firebase GET Node", function () {
	const firebase = require("../build/nodes/firebase-get");

	before(function (done) {
		Firebase.configNodeSatisfiesVersion = true;
		helper.startServer(done);
	});

	after(function (done) {
		helper.stopServer(done);
	});

	afterEach(async function () {
		await helper.unload();
	});

	context("When NODE is loaded", () => {
		it("should be loaded", function (done) {
			const newFlow = [{ id: "firebase", type: "firebase-get", name: "test/stream", database: "database" }, ...flow];

			helper.load([firebase, database], newFlow, function () {
				try {
					const n1 = helper.getNode("firebase");
					const n2 = helper.getNode("database");

					n1.should.have.property("name", "test/stream");
					n1.should.have.property("type", "firebase-get");

					n2.should.have.property("name", "My Database");
					n2.should.have.property("type", "firebase-config");

					n1.database.should.be.Object();
					n2.addStatusListener.should.have.been.called;
					done();
				} catch (error) {
					done(error);
				}
			});
		});

		it("should throw an error without database configured", function (done) {
			const newFlow = [{ id: "firebase", type: "firebase-get", database: null }, ...flow];

			helper.load([firebase, database], newFlow, function () {
				try {
					const logEvents = helper.log().args.filter(function (evt) {
						return evt[0].type == "firebase-get";
					});
					logEvents[0][0].should.have.property("msg", "Database not selected or disabled!");
					done();
				} catch (error) {
					done(error);
				}
			});
		});
	});

	context("When PATH is configured in the node", () => {
		it("should throw an error with bad type", function (done) {
			const newFlow = [
				{ id: "firebase", type: "firebase-get", database: "database", path: 123, pathType: "str" },
				...flow,
			];

			helper.load([firebase, database], newFlow, function () {
				const n1 = helper.getNode("firebase");

				n1.receive({ payload: "" });

				setImmediate(function () {
					try {
						const logEvents = helper.log().args.filter(function (evt) {
							return evt[0].type == "firebase-get";
						});
						logEvents.should.have.length(1);
						logEvents[0][0].should.have.property("msg", new Error("The 'Path' field is undefined, please re-configure this node."));
						done();
					} catch (error) {
						done(error);
					}
				});
			});
		});

		it("should throw an error with bad characters", function (done) {
			const newFlow = [
				{ id: "firebase", type: "firebase-get", database: "database", path: "test.", pathType: "str" },
				...flow,
			];

			helper.load([firebase, database], newFlow, function () {
				const n1 = helper.getNode("firebase");

				n1.receive({ payload: "" });

				setImmediate(function () {
					try {
						const logEvents = helper.log().args.filter(function (evt) {
							return evt[0].type == "firebase-get";
						});
						logEvents.should.have.length(1);
						logEvents[0][0].should.have.property("msg", new Error('PATH must not contain ".", "#", "$", "[", or "]"'));
						done();
					} catch (error) {
						done(error);
					}
				});
			});
		});

		it("should not throw an error with empty field", function (done) {
			const newFlow = [
				{ id: "firebase", type: "firebase-get", database: "database", path: "", pathType: "str" },
				...flow,
			];

			helper.load([firebase, database], newFlow, function () {
				const n1 = helper.getNode("firebase");

				n1.receive({ payload: "" });

				setImmediate(function () {
					try {
						const logEvents = helper.log().args.filter(function (evt) {
							return evt[0].type == "firebase-get";
						});
						logEvents.should.have.length(0);
						done();
					} catch (error) {
						done(error);
					}
				});
			});
		});
	});

	context("When PATH is configured dynamically", () => {
		it("should throw an error with bad type", function (done) {
			const newFlow = [
				{ id: "firebase", type: "firebase-get", database: "database", path: "topic", pathType: "msg" },
				...flow,
			];

			helper.load([firebase, database], newFlow, function () {
				const n1 = helper.getNode("firebase");

				n1.receive({ payload: "", topic: 123 });

				setImmediate(function () {
					try {
						const logEvents = helper.log().args.filter(function (evt) {
							return evt[0].type == "firebase-get";
						});
						logEvents.should.have.length(1);
						logEvents[0][0].should.have.property("msg", new Error("PATH must be a string!"));
						done();
					} catch (error) {
						done(error);
					}
				});
			});
		});

		it("should throw an error with bad characters", function (done) {
			const newFlow = [
				{ id: "firebase", type: "firebase-get", database: "database", path: "topic", pathType: "msg" },
				...flow,
			];

			helper.load([firebase, database], newFlow, function () {
				const n1 = helper.getNode("firebase");

				n1.receive({ payload: "", topic: "test." });

				setImmediate(function () {
					try {
						const logEvents = helper.log().args.filter(function (evt) {
							return evt[0].type == "firebase-get";
						});
						logEvents.should.have.length(1);
						logEvents[0][0].should.have.property("msg", new Error('PATH must not contain ".", "#", "$", "[", or "]"'));
						done();
					} catch (error) {
						done(error);
					}
				});
			});
		});

		it("should not throw an error with empty field", function (done) {
			const newFlow = [
				{ id: "firebase", type: "firebase-get", database: "database", path: "topic", pathType: "msg" },
				...flow,
			];

			helper.load([firebase, database], newFlow, function () {
				const n1 = helper.getNode("firebase");

				n1.receive({ payload: "", topic: "" });

				setImmediate(function () {
					try {
						const logEvents = helper.log().args.filter(function (evt) {
							return evt[0].type == "firebase-get";
						});
						logEvents.should.have.length(0);
						done();
					} catch (error) {
						done(error);
					}
				});
			});
		});

		it("should not throw an error with undefined msg", function (done) {
			const newFlow = [
				{ id: "firebase", type: "firebase-get", database: "database", path: "badTopic", pathType: "msg" },
				...flow,
			];

			helper.load([firebase, database], newFlow, function () {
				const n1 = helper.getNode("firebase");

				n1.receive({ payload: "", topic: "" });

				setImmediate(function () {
					try {
						const logEvents = helper.log().args.filter(function (evt) {
							return evt[0].type == "firebase-get";
						});
						logEvents.should.have.length(0);
						done();
					} catch (error) {
						done(error);
					}
				});
			});
		});
	});

	context("When NODE is removed/redeployed", () => {
		it("should remove node status", function (done) {
			const newFlow = [{ id: "firebase", type: "firebase-get", database: "database" }, ...flow];

			helper.load([firebase, database], newFlow, function () {
				const n1 = helper.getNode("firebase");

				n1.close(true)
					.then(() => {
						n1.database.removeStatusListener.should.have.been.called;
						done();
					})
					.catch((error) => done(error));
			});
		});
	});
});
