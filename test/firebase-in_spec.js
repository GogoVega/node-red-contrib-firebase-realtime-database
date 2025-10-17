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
	{ id: "database", type: "firebase-config", name: "My Database", authType: "anonymous" },
	{ id: "h1", type: "helper" },
];

const { Firebase } = require("../build/lib/firebase-node");

Firebase.configNodeSatisfiesVersion = true;

// TODO: Add more tests
describe("Firebase IN Node", function () {
	const firebase = require("../build/nodes/firebase-in");

	before(function (done) {
		helper.startServer(done);
	});

	after(function (done) {
		helper.stopServer(done);
	});

	afterEach(function () {
		return helper.unload();
	});

	context("When NODE is loaded", () => {
		it("should be loaded", function (done) {
			const newFlow = [{ id: "firebase", type: "firebase-in", name: "test/stream", database: "database" }, ...flow];

			helper.load([firebase, database], newFlow, function () {
				try {
					const n1 = helper.getNode("firebase");
					const n2 = helper.getNode("database");

					n1.should.have.property("name", "test/stream");
					n1.should.have.property("type", "firebase-in");

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
			const newFlow = [{ id: "firebase", type: "firebase-in", database: null, listenerType: "value", path: "" }, ...flow];

			helper.load([firebase, database], newFlow, function () {
				try {
					const logEvents = helper.log().args.filter(function (evt) {
						return evt[0].type == "firebase-in";
					});
					logEvents.should.have.length(1);
					logEvents[0][0].should.have.property("msg", "Database not selected or disabled!");
					done();
				} catch (error) {
					done(error);
				}
			});
		});
	});

	context("When LISTENER is configured", () => {
		it("should throw an error with bad listener", function (done) {
			const newFlow = [{ id: "firebase", type: "firebase-in", database: "database", listenerType: "bad" }, ...flow];

			helper.load([firebase, database], newFlow, function () {
				try {
					const logEvents = helper.log().args.filter(function (evt) {
						return evt[0].type == "firebase-in";
					});
					logEvents.should.have.length(1);
					done();
				} catch (error) {
					done(error);
				}
			});
		});

		it("should not throw an error", function (done) {
			const newFlow = [{ id: "firebase", type: "firebase-in", database: "database", listenerType: "value", path: "test" }, ...flow];

			helper.load([firebase, database], newFlow, function () {
				try {
					const logEvents = helper.log().args.filter(function (evt) {
						return evt[0].type == "firebase-in";
					});
					logEvents.should.have.length(0);
					done();
				} catch (error) {
					done(error);
				}
			});
		});
	});

	context("When PATH is configured", () => {
		it("should throw an error with bad characters", function (done) {
			const newFlow = [{ id: "firebase", type: "firebase-in", database: "database", listenerType: "value", path: "test." }, ...flow];

			helper.load([firebase, database], newFlow, function () {
				try {
					const logEvents = helper.log().args.filter(function (evt) {
						return evt[0].type == "firebase-in";
					});
					logEvents.should.have.length(1);
					logEvents[0][0].should.have.property("msg", new Error('PATH must not contain ".", "#", "$", "[", or "]"'));
					done();
				} catch (error) {
					done(error);
				}
			});
		});

		it("should not throw an error with empty field", function (done) {
			const newFlow = [{ id: "firebase", type: "firebase-in", database: "database", listenerType: "value", path: "" }, ...flow];

			helper.load([firebase, database], newFlow, function () {
				try {
					const logEvents = helper.log().args.filter(function (evt) {
						return evt[0].type == "firebase-in";
					});
					logEvents.should.have.length(0);
					done();
				} catch (error) {
					done(error);
				}
			});
		});
	});

	context("When NODE is removed/redeployed", () => {
		it("should remove node status", function (done) {
			const newFlow = [{ id: "firebase", type: "firebase-in", database: "database", listenerType: "value", path: "test" }, ...flow];

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
