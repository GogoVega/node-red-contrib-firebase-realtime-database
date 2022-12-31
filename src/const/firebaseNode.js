const defaultListeners = {
	value: {},
	child_added: {},
	child_changed: {},
	child_moved: {},
	child_removed: {},
};

const listeners = {
	value: "onValue",
	child_added: "onChildAdded",
	child_changed: "onChildChanged",
	child_moved: "onChildMoved",
	child_removed: "onChildRemoved",
};

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

module.exports = { defaultListeners, listeners, queryConstraints, queryMethods };
