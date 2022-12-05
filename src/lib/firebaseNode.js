function isPathValid(path, empty = false) {
	if (!empty && path === undefined) return "The msg containing the PATH do not exist!";
	if (!empty && !path) return "PATH must be non-empty string!";
	if (path && typeof path !== "string") return "PATH must be a string!";
	if (path?.match(/[.#$\[\]]/g)) return `PATH must not contain ".", "#", "$", "[", or "]"`;
	return;
}

function removeNode(nodes = [], nodeId) {
	nodes.some((node) => {
		if (node.id !== nodeId) return;
		nodes.splice(nodes.indexOf(node), 1);
	});
}

function setNodeStatus(self, connected = false) {
	if (connected) {
		self.status({ fill: "green", shape: "dot", text: "connected" });
	} else {
		self.status({ fill: "yellow", shape: "ring", text: "connecting" });
	}
}

module.exports = { isPathValid, removeNode, setNodeStatus };
