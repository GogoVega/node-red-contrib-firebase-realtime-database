const should = require("should");

// TODO: Add more tests
describe("Firebase Nodes", function () {
	context("When PATH is configured", () => {
		const { parsePath } = require("../src/lib/firebaseNode");

		it("should not throw an error with empty field", () => {
			parsePath("", true).should.equal("");
		});

		it("should throw an error with empty field", () => {
			should.throws(() => parsePath(""));
		});

		it("should not throw an error with undefined field", () => {
			should.doesNotThrow(() => parsePath(undefined, true));
		});

		it("should throw an error with undefined field", () => {
			should.throws(() => parsePath(undefined));
		});

		it("should throw an error with bad caracters", () => {
			should.throws(() => parsePath("."));
		});
	});

	context("When Query constraints is configured", () => {
		const { parseQueryConstraints } = require("../src/lib/firebaseNode");

		it("should not throw an error with empty object", () => {
			should.doesNotThrow(() => parseQueryConstraints({}));
		});

		it("should not throw an error with undefined field", () => {
			should.doesNotThrow(() => parseQueryConstraints(undefined));
		});

		it("should throw an error with bad constraint", () => {
			should.throws(() => parseQueryConstraints({ limit: 0 }));
		});
	});
});
