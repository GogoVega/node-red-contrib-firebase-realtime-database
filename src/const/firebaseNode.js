const queryConstraints = [
	"endAt",
	"endBefore",
	"equalTo",
	"limitToFirst",
	"limitToLast",
	"orderByChild",
	"orderByKey",
	"orderByPriority",
	"orderByValue",
	"startAfter",
	"startAt",
];

const queryMethods = ["set", "push", "update", "remove"];

module.exports = { queryConstraints, queryMethods };
