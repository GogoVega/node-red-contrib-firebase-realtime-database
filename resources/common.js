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

const FirebaseUI = (function () {
	"use strict";

	const validators = {
		boolean: function () {
			return function (value, opt) {
				// TODO: checkbox returns "on" Bug or limitation?
				// oneditsave returns boolean so, skip "on" value
				if (typeof value === "boolean" || value === "on") return true;
				if (opt?.label) return i18n("errors.invalid-bool-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-bool") : false;
			};
		},
		child: function (blankAllowed = false) {
			const regex = blankAllowed ? /[\s.#$\[\]]|\/{2,}/ : /^$|[\s.#$\[\]]|\/{2,}/;
			return function (value, opt) {
				if (typeof value === "string" && !regex.test(value)) return true;
				if (!blankAllowed && !value) return opt ? i18n("errors.empty-child") : false;
				return opt ? i18n("errors.invalid-child") : false;
			};
		},
		childType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(msg|str|flow|global|jsonata)$/.test(value)) return true;
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
		path: function (blankAllowed = false) {
			const regex = blankAllowed ? /[\s.#$\[\]]|\/{2,}/ : /^$|[\s.#$\[\]]|\/{2,}/;
			return function (value, opt) {
				if (typeof value === "string" && !regex.test(value)) return true;
				if (!blankAllowed && !value) return opt ? i18n("errors.empty-path") : false;
				return opt ? i18n("errors.invalid-path") : false;
			};
		},
		pathType: function () {
			return function (value, opt) {
				if (typeof value === "string" && /^(msg|str|flow|global|jsonata)$/.test(value)) return true;
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
			return (value, opt) => {
				// TODO: Replace context by type (node-red#4440)
				const { blankAllowed, context } = opts;
				const type = $(`#node-input-${typeName}`).val();

				if (type === "str" && typeName === "pathType") {
					const validatePath = this.path(blankAllowed);
					return validatePath(value, opt);
				}

				if (type === "str" && typeName === "constraint-childType") {
					const validateChild = this.child(blankAllowed);
					return validateChild(value, opt);
				}

				const validateTypedProperty = RED.validators.typedInput(typeName);
				return validateTypedProperty.call(context ?? null, value, opt);
			};
		},
		valueType: function () {
			return (value, opt) => {
				if (/^(bool|date|flow|global|msg|null|num|str)$/.test(value)) return true;
				if (opt?.label) return i18n("errors.invalid-type-prop", { prop: opt.label });
				return opt ? i18n("errors.invalid-type") : false;
			};
		},
	};

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

		/**
		 * @type {{path: string, searchVal: string, options: any[]}}
		 */
		const currentCompletions = {
			path: "",
			searchVal: "",
			options: [],
		};

		// Retrieve only the options for the depth of the given path - avoids loading the entire data from database
		async function getCompletions(value, configNodeId) {
			const paths = value.split("/");
			const searchValue = paths.pop();

			const path = paths.join("/");

			const pathEnd = /^$|\/$/.test(value);
			const pathEqual = currentCompletions.path === path;

			if (pathEnd || !pathEqual) {
				currentCompletions.path = path;
				try {
					currentCompletions.options = await get(`firebase/rtdb/autocomplete/${configNodeId}${value ? "?path=" + path : ""}`);
				} catch (error) {
					console.error("An error occurred while getting autocomplete options:\n", error);
				}
			}

			currentCompletions.searchVal = searchValue;

			return currentCompletions;
		}

		return async function (value, done) {
			const configNodeId = $("#node-input-database").val();

			if (!configNodeId || configNodeId === "_ADD_") return [];

			const { path, searchVal, options } = await getCompletions(value, configNodeId);

			const matches = options
				.reduce((opts, optVal) => {
					const valMatch = getMatch(optVal, searchVal);

					if (valMatch.found) {
						const element = $("<div>", { style: "display: flex" });

						$("<div/>", { style: "font-family: var(--red-ui-monospace-font); white-space:nowrap; overflow: hidden; flex-grow:1" })
							.append(generateSpans(valMatch))
							.appendTo(element);

						opts.push({
							value: `${path}${path && "/"}${optVal}`,
							label: element,
							i: valMatch.index,
						});
					}

					return opts;
				}, [])
				.sort(function (A, B) { return A.i - B.i });

			if (done) return done(matches);

			return matches;
		};
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

	class TypedPathInput {
		constructor() {
			this._autoComplete = false;
			this._blankAllowed = false;
			this._modeByDefault = "dynamic";
			this.pathField = $("#node-input-path");
		}

		/**
		 * Allow blank path
		 * @param {boolean} value True to allow blank path
		 * @returns {TypedPathInput}
		 */
		blankAllowed(value) {
			if (typeof value !== "boolean") throw new TypeError("blankAllowed must be a boolean");
			this._blankAllowed = value;
			return this;
		}

		/**
		 * Build the typedPathField
		 * @returns {void}
		 */
		build() {
			const others = this._autoComplete ? { autoComplete: autoComplete() } : {};
			this.staticFieldOptions = [{ value: "str", label: "string", icon: "red/images/typedInput/az.svg", validate: validators.path(this._blankAllowed), ...others }];
			this.dynamicFieldOptions = [...this.staticFieldOptions, "msg", "flow", "global", "jsonata"];
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
		typedPathField: { create: () => new TypedPathInput() },
		validators: validators,
	};
})();
