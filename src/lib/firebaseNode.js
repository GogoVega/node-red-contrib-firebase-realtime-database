function isPathValid(path, empty = false) {
	if (!empty && path === undefined) return "The msg containing the PATH do not exist!";
	if (!empty && !path) return "PATH must be non-empty string!";
	if (path && typeof path !== "string") return "PATH must be a string!";
	if (path?.match(/[.#$\[\]]/g)) return `PATH must not contain ".", "#", "$", "[", or "]"`;
	return;
}

module.exports = { isPathValid };
