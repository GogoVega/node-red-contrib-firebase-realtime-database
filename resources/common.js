"use strict";

const FirebaseUI = (function () {
	const validators = {
		boolean: function () {
			return function (value, opt) {
				// TODO: checkbox returns "on"
				if (typeof value === "boolean" || value === "true" || value === "false") return true;
				if (opt?.label) return i18n("errors.invalid-bool-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-bool") : false;
			}
		},
		child: function (blankAllowed = false) {
			const regex = blankAllowed ? /[\s.#$\[\]]/ : /^$|[\s.#$\[\]]/;
			return function (value, opt) {
				if (typeof value === "string" && !regex.test(value)) return true;
				if (!blankAllowed && !value) return opt ? i18n("errors.empty-child") : false;
				return opt ? i18n("errors.invalid-child") : false;
			}
		},
		listenerType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(none|value|child_added|child_changed|child_moved|child_removed)$/.test(value)) return true;
				if (opt?.label) return i18n("errors.invalid-type-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-type") : false;
			}
		},
		onDisconnectQueryType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(msg|none|cancel|set|update|remove|setWithPriority)$/.test(value)) return true;
				if (opt?.label) return i18n("errors.invalid-type-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-type") : false;
			}
		},
		outputType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(auto|string)$/.test(value)) return true;
				if (opt?.label) return i18n("errors.invalid-type-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-type") : false;
			}
		},
		path: function (blankAllowed = false) {
			const regex = blankAllowed ? /[\s.#$\[\]]/ : /^$|[\s.#$\[\]]/;
			return function (value, opt) {
				if (typeof value === "string" && !regex.test(value)) return true;
				if (!blankAllowed && !value) return opt ? i18n("errors.empty-path") : false;
				return opt ? i18n("errors.invalid-path") : false;
			}
		},
		pathType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(msg|str)$/.test(value)) return true;
				if (opt?.label) return i18n("errors.invalid-type-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-type") : false;
			}
		},
		priority: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^[1-9][0-9]*$/.test(value)) return true;
				if (typeof value === "string" && /^$|[.]/.test(value))
					return opt ? opt.label ? i18n("errors.no-integer-prop", { prop: opt.label }) : i18n("errors.no-integer") : false;
				if (typeof value === "string" && /^-+|^0$/.test(value))
					return opt ? opt.label ? i18n("errors.invalid-range-prop", { prop: opt.label }) : i18n("errors.invalid-range") : false;
				return opt ? opt.label ? i18n("errors.invalid-num-prop", { prop: opt.label }) : i18n("errors.invalid-num") : false;
			}
		},
		queryType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(none|set|push|update|remove|setPriority|setWithPriority)$/.test(value)) return true;
				if (opt?.label) return i18n("errors.invalid-type-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-type") : false;
			}
		},
		sendMsgEvent: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(onConnected,)?(|onConnected|onDisconnect)$/.test(value)) return true;
				if (opt?.label) return i18n("errors.invalid-type-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-type") : false;
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
