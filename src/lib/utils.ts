declare global {
	interface String {
		toPascalCase(): string;
	}
}

String.prototype.toPascalCase = function () {
	const words = this.match(/[a-z]+/gi);

	if (!words) return "";

	return words.map((word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()).join(" ");
};

function printEnumKeys(obj: object) {
	return Object.keys(obj)
		.filter((x) => !Number.isInteger(parseInt(x)))
		.map((x) => `'${x}'`)
		.join(", ");
}

export { printEnumKeys };
