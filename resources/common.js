"use strict";

const FirebaseUI = (function () {
	const validators = {
		boolean: function () {
			return function (value, opt) {
				// TODO: checkbox returns "on"
				if (typeof value === "boolean" || value === "true" || value === "false") return true;
				return false;
			}
		},
		child: function (blankAllowed = false) {
			const regex = blankAllowed ? /[\s.#$\[\]]/ : /^$|[\s.#$\[\]]/;
			return function (value, opt) {
				if (typeof value === "string" && !regex.test(value)) return true;
				return false;
			}
		},
		listenerType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(none|value|child_added|child_changed|child_moved|child_removed)$/.test(value)) return true;
				return false;
			}
		},
		onDisconnectQueryType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(msg|none|cancel|set|update|remove|setWithPriority)$/.test(value)) return true;
				return false;
			}
		},
		outputType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(auto|string)$/.test(value)) return true;
				return false;
			}
		},
		path: function (blankAllowed = false) {
			const regex = blankAllowed ? /[\s.#$\[\]]/ : /^$|[\s.#$\[\]]/;
			return function (value, opt) {
				if (typeof value === "string" && !regex.test(value)) return true;
				return false;
			}
		},
		pathType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(msg|str)$/.test(value)) return true;
				return false;
			}
		},
		priority: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^[1-9][0-9]*$/.test(value)) return true;
				return false;
			}
		},
		queryType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(none|set|push|update|remove|setPriority|setWithPriority)$/.test(value)) return true;
				return false;
			}
		},
		sendMsgEvent: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(onConnected,)?(|onConnected|onDisconnect)$/.test(value)) return true;
				return false;
			}
		},
		typedInput: function (typeName, opts = {}) {
			return (value, opt) => {
				const type = $(`#node-input-${typeName}`).val();
				const { blankAllowed } = opts;

				if (type === "str" && typeName === "pathType") {
					const validatePath = this.path(blankAllowed);
					return validatePath(value, opt);
				}

				const validateTypedProperty = RED.validators.typedInput(typeName);
				return validateTypedProperty(value, opt);
			}
		},
	};

	class TypedPathInput {
		constructor(blankAllowed) {
			this.staticFieldOptions = [{ value: "str", label: "string", icon: "red/images/typedInput/az.svg", validate: validators.path(blankAllowed) }];
			this.dynamicFieldOptions = [...this.staticFieldOptions, "msg"];
			this.pathField = $("#node-input-path");
			this.#build();
		}

		#build() {
			this.pathField.typedInput({
				typeField: "#node-input-pathType",
				types: this.dynamicFieldOptions,
			});
		}

		updateTypesToStaticOrDynamic(dynamic) {
			const types = dynamic ? this.dynamicFieldOptions : this.staticFieldOptions;
			this.pathField.typedInput("types", types);
		}
	}

	function i18n(key, tplStrs) {
		return RED._(`@gogovega/node-red-contrib-firebase-realtime-database/load-config:validator.${key}`, tplStrs);
	}

	function i18nFullOptions(key, dict, group = "", tplStrs) {
		if (typeof group === "object" && !tplStrs) {
			tplStrs = group;
			group = "";
		}

		return RED._(`@gogovega/node-red-contrib-firebase-realtime-database/${dict}:${group || dict}.${key}`, tplStrs);
	}

	return {
		_: i18nFullOptions,
		typedPathField: { create: (blankAllowed) => new TypedPathInput(blankAllowed) },
		validators: validators,
	};
})();
