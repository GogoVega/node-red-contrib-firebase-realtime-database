function printEnumKeys(obj: object) {
	return Object.keys(obj)
		.filter((x) => !Number.isInteger(parseInt(x)))
		.toString();
}

export { printEnumKeys };
