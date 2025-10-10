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

var FirebaseUI = FirebaseUI || (function () {
	"use strict";

	const i18n = function (key, tplStrs) {
		return i18nFullOptions(key, "firebase-in", "validator", tplStrs);
	};

	const validators = {
		boolean: function () {
			return function (value, opt) {
				// checkbox may returns "on" - NR#4715
				if (typeof value === "boolean" || value === "on") return true;
				if (opt?.label) return i18n("errors.invalid-bool-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-bool") : false;
			};
		},
		child: function (allowBlank = false) {
			const regex = allowBlank ? /^\s|\s$|[.#$\[\]]|\/{2,}/ : /^$|^\s|\s$|[.#$\[\]]|\/{2,}/;
			return function (value, opt) {
				if (typeof value === "string" && !regex.test(value)) return true;
				if (!allowBlank && !value) return opt ? i18n("errors.empty-child") : false;
				return opt ? i18n("errors.invalid-child") : false;
			};
		},
		childType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(msg|str|flow|global|jsonata|env)$/.test(value)) return true;
				if (opt?.label) return i18n("errors.invalid-type-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-type") : false;
			};
		},
		listenerType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(none|value|child_added|child_changed|child_moved|child_removed)$/.test(value)) return true;
				if (opt?.label) return i18n("errors.invalid-type-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-type") : false;
			};
		},
		onDisconnectQueryType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(msg|none|cancel|set|update|remove|setWithPriority)$/.test(value)) return true;
				if (opt?.label) return i18n("errors.invalid-type-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-type") : false;
			};
		},
		outputType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(auto|json|string)$/.test(value)) return true;
				if (opt?.label) return i18n("errors.invalid-type-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-type") : false;
			};
		},
		path: function (allowBlank = false) {
			const regex = allowBlank ? /^\s|\s$|[.#$\[\]]|\/{2,}/ : /^$|^\s|\s$|[.#$\[\]]|\/{2,}/;
			return function (value, opt) {
				if (typeof value === "string" && !regex.test(value)) return true;
				if (!allowBlank && !value) return opt ? i18n("errors.empty-path") : false;
				return opt ? i18n("errors.invalid-path") : false;
			};
		},
		pathType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(msg|str|flow|global|jsonata|env)$/.test(value)) return true;
				if (opt?.label) return i18n("errors.invalid-type-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-type") : false;
			};
		},
		priority: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^[1-9][0-9]*$/.test(value)) return true;
				if (typeof value === "string" && /^$|[.]/.test(value))
					return opt ? opt.label ? i18n("errors.no-integer-prop", { prop: opt.label }) : i18n("errors.no-integer") : false;
				if (typeof value === "string" && /^-+|^0$/.test(value))
					return opt ? opt.label ? i18n("errors.invalid-range-prop", { prop: opt.label }) : i18n("errors.invalid-range") : false;
				return opt ? opt.label ? i18n("errors.invalid-num-prop", { prop: opt.label }) : i18n("errors.invalid-num") : false;
			};
		},
		queryType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(none|set|push|update|remove|setPriority|setWithPriority)$/.test(value)) return true;
				if (opt?.label) return i18n("errors.invalid-type-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-type") : false;
			};
		},
		sendMsgEvent: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(onConnected,)?(|onConnected|onDisconnect)$/.test(value)) return true;
				if (opt?.label) return i18n("errors.invalid-type-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-type") : false;
			};
		},
		typedInput: function (typeName, opts = {}) {
			let options = typeName;

			if (typeof typeName === "string") {
				options = {
					allowBlank: false,
					isConfig: false,
					typeField: typeName,
					...opts,
				};
			}

			return (value, opt) => {
				const type = options.type || $(`#node-input-${options.typeField}`).val();

				if (type === "str" && options.typeField === "pathType") {
					const validatePath = this.path(options.allowBlank);
					return validatePath(value, opt);
				}

				if (type === "str" && options.typeField === "childType") {
					const validateChild = this.child(options.allowBlank);
					return validateChild(value, opt);
				}

				// NR version
				const match = /([0-9]{1,2})\.([0-9]{1,3})\.([0-9]{1,3})-?/.exec(RED.settings.version || "0.0.0");
				match?.shift();

				// If NR version >= 3.1.3 use the new validators
				const [major, minor, patch] = match?.map((v) => parseInt(v, 10)) || [0, 0, 0];
				if (major > 3 || (major === 3 && (minor > 1 || (minor === 1 && patch >= 3))))
					return RED.validators.typedInput(options)(value, opt);

				// Workaround for node-red#4440 to pass type
				const validateTypedProperty = RED.validators.typedInput(options.typeField || "fake-typeName");
				const context = options.type ? { "fake-typeName": options.type } : null;
				return validateTypedProperty.call(context, value, opt);
			};
		},
		valueType: function () {
			return (value, opt) => {
				if (/^(bool|date|flow|global|jsonata|env|msg|null|num|str)$/.test(value)) return true;
				if (opt?.label) return i18n("errors.invalid-type-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-type") : false;
			};
		},
	};

	// Autocomplete Cache System
	let contextKnownKeys = new Set();
	let contextCache = {};
	if (RED.events) {
		RED.events.on("editor:close", function () {
			contextCache = {};
			contextKnownKeys = new Set();
		});
	}

	const autoComplete = function () {
		function getMatch(value, searchValue) {
			const idx = value.toLowerCase().indexOf(searchValue.toLowerCase());
			const len = idx > -1 ? searchValue.length : 0;
			return {
				index: idx,
				found: idx > -1,
				pre: value.substring(0, idx),
				match: value.substring(idx, idx + len),
				post: value.substring(idx + len),
			};
		}

		function generateSpans(match) {
			const els = [];
			if (match.pre) els.push($("<span/>").text(match.pre));
			if (match.match) els.push($("<span/>", { style: "font-weight: bold; color: var(--red-ui-text-color-link);" }).text(match.match));
			if (match.post) els.push($("<span/>").text(match.post));
			return els;
		}

		const getKeysFromRuntime = function (configNodeId, searchKey, done) {
			if (searchKey.length > 0) {
				try {
					RED.utils.normalisePropertyExpression(searchKey);
				} catch (error) {
					// Not a valid context key, so don't try looking up
					done();
					return;
				}
			}

			const url = `firebase/rtdb/autocomplete/${configNodeId}${searchKey ? `?path=${encodeURIComponent(searchKey)}` : ""}`;

			if (contextCache[url]) {
				done();
			} else {
				$.getJSON(url, function (data) {
					contextCache[url] = true;
					const keys = data || [];
					const keyPrefix = searchKey + (searchKey.length > 0 ? "/" : "")
					keys.forEach((key) => {
						contextKnownKeys.add(keyPrefix + key);
					});

					done();
				})
			}
		}

		const getKeys = function (key, configNodeId, done) {
			const keyParts = key.split('/');
			const partialKey = keyParts.pop();
			const searchKey = keyParts.join('/');

			getKeysFromRuntime(configNodeId, searchKey, function () {
				if (contextKnownKeys.has(key)) {
					getKeysFromRuntime(configNodeId, key, function () {
						done(contextKnownKeys);
					});
				}

				done(contextKnownKeys);
			})
		}

		return function (val, done) {
			const configNodeId = $("#node-input-database").val();

			if (!configNodeId || configNodeId === "_ADD_") done([]);

			getKeys(val, configNodeId, function (keys) {
				const matches = []
				keys.forEach((v) => {
					let optVal = v;
					let valMatch = getMatch(optVal, val);

					if (valMatch.found) {
						const element = $("<div>", { style: "display: flex" });
						const valEl = $("<div/>", { style: "font-family: var(--red-ui-monospace-font); white-space: nowrap; overflow: hidden; flex-grow: 1;" });
						valEl.append(generateSpans(valMatch));
						valEl.appendTo(element);
						matches.push({
							value: optVal,
							label: element,
						});
					}
				});

				matches.sort(function (a, b) { return a.value.localeCompare(b.value) });
				done(matches);
			})
		}
	}

	class TypedPathInput {
		constructor() {
			this._autoComplete = {};
			this._allowBlank = false;
			this.mode = "dynamic";
			this.pathField = $("#node-input-path");
		}

		#applyNewTypes() {
			const types = this.mode === "static" ? this.staticFieldOptions : this.dynamicFieldOptions;
			this.pathField.typedInput("types", types);
		}

		/**
		 * Allow blank path
		 * @param {boolean} value True to allow blank path
		 * @returns {TypedPathInput}
		 */
		allowBlank(value) {
			if (typeof value !== "boolean") throw new TypeError("allowBlank must be a boolean");
			this._allowBlank = value;
			return this;
		}

		/**
		 * Build the typedPathField
		 * @returns {void}
		 */
		build() {
			this.staticFieldOptions = [{
				value: "str",
				label: "string",
				icon: "red/images/typedInput/az.svg",
				validate: validators.path(this._allowBlank),
				...this._autoComplete
			}, "env"];
			this.dynamicFieldOptions = [...this.staticFieldOptions, "msg", "flow", "global", "jsonata"];
			this.pathField.typedInput({
				typeField: "#node-input-pathType",
				types: this.mode === "dynamic" ? this.dynamicFieldOptions : this.staticFieldOptions,
			});
		}

		/**
		 * Enable the autocomplete option to the path field
		 * @returns {TypedPathInput}
		 */
		enableAutoComplete() {
			this._autoComplete = { autoComplete: autoComplete() };
			return this;
		}

		/**
		 * The path may be defined dynamically or statically. By default, dynamic types are displayed.
		 * @param {"static"|"dynamic"} mode The mode to set (`static` or `dynamic`)
		 * @returns {TypedPathInput}
		 */
		modeByDefault(mode) {
			if (mode !== "static" && mode !== "dynamic")
				throw new Error("mode must be 'static' or 'dynamic'");
			this.mode = mode;
			return this;
		}

		/**
		 * Switch the types of the typedPathField to static or dynamic
		 * @param {"static"|"dynamic"} mode The mode to swith on (`static` or `dynamic`)
		 * @returns {void}
		 */
		switchMode(mode) {
			if (mode !== "static" && mode !== "dynamic")
				throw new Error("mode must be 'static' or 'dynamic'");
			this.mode = mode;
			this.#applyNewTypes();
		}
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
		typedPathField: { create: () => new TypedPathInput() },
		validators: validators,
	};
})();
