/**
 * Copyright 2022-2023 Gauthier Dandele
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

	const validators = {
		boolean: function () {
			return function (value, opt) {
				// TODO: checkbox returns "on" - bug which will probably be fixed for v4
				// oneditsave returns boolean so, skip "on" value
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

				// If NR version >= 3.1.3 use the new validators
				const redVersion = (RED.settings.version || "0.0.0").split(".").map((s) => Number(s));
				if (redVersion[0] > 3 || (redVersion[0] === 3 && (redVersion[1] > 1 || (redVersion[1] === 1 && redVersion[2] >= 3))))
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

			const url = `firebase/rtdb/autocomplete/${configNodeId}?path=${encodeURIComponent(searchKey)}`;

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

	function get(URL) {
		return new Promise((resolve, reject) => {
			$.ajax({
				type: "GET",
				url: URL,
				beforeSend: function (jqXHR) {
					const authTokens = RED.settings.get("auth-tokens");
					if (authTokens) jqXHR.setRequestHeader("Authorization", `Bearer ${authTokens.access_token}`);
				},
				success: (data) => resolve(data),
				error: (jqXHR, _textStatus, errorThrown) => reject(`${errorThrown}: ${jqXHR.responseText}`),
				dataType: "json",
			});
		});
	}

	function post(URL, data) {
		return new Promise((resolve, reject) => {
			$.ajax({
				type: "POST",
				url: URL,
				data: data,
				dataType: "json",
				beforeSend: function (jqXHR) {
					const authTokens = RED.settings.get("auth-tokens");
					if (authTokens) jqXHR.setRequestHeader("Authorization", `Bearer ${authTokens.access_token}`);
				},
				success: (data) => resolve(data),
				error: (jqXHR, _textStatus, errorThrown) => reject(`${errorThrown}: ${jqXHR.responseText}`),
			});
		});
	}

	class TypedPathInput {
		constructor() {
			this._autoComplete = false;
			this._allowBlank = false;
			this._modeByDefault = "dynamic";
			this.pathField = $("#node-input-path");
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
			const others = this._autoComplete ? { autoComplete: autoComplete() } : {};
			this.staticFieldOptions = [{ value: "str", label: "string", icon: "red/images/typedInput/az.svg", validate: validators.path(this._allowBlank), ...others }];
			this.dynamicFieldOptions = [...this.staticFieldOptions, "msg", "flow", "global", "jsonata", "env"];
			this.pathField.typedInput({
				typeField: "#node-input-pathType",
				types: this._modeByDefault === "dynamic" ? this.dynamicFieldOptions : this.staticFieldOptions,
			});
		}

		/**
		 * Enable the autocomplete option to the path field
		 * @returns {TypedPathInput}
		 */
		enableAutoComplete() {
			this._autoComplete = true;
			return this;
		}

		/**
		 * The path may be defined dynamically or statically. By default, dynamic types are displayed.
		 * @param {"static"|"dynamic"} mode The mode to set (`static` or `dynamic`)
		 * @returns {TypedPathInput}
		 */
		modeByDefault(mode) {
			if (mode === "static") this._modeByDefault = "static";
			else if (mode === "dynamic") this._modeByDefault = "dynamic";
			else throw new Error("mode must be 'static' or 'dynamic'");
			return this;
		}

		/**
		 * Switch the types of the typedPathField to static or dynamic
		 * @param {boolean} toStatic True to set the types to static
		 * @returns {void}
		 */
		switchModeToStaticOrDynamic(toStatic) {
			const types = toStatic ? this.staticFieldOptions : this.dynamicFieldOptions;
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
		express: { get: get, post: post },
		typedPathField: { create: () => new TypedPathInput() },
		validators: validators,
	};
})();
