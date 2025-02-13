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

var FirebaseQueryConstraintsContainer = FirebaseQueryConstraintsContainer || (function () {
	"use strict";

	if (!window.FirebaseUI) {
		return;
	}

	const i18n = function (key) {
		return FirebaseUI._(key, "load-config", "query-constraints");
	};

	const queryConstraintTypes = new Array("endAt", "endBefore", "equalTo", "limitToFirst", "limitToLast", "orderByChild", "orderByKey", "orderByPriority", "orderByValue", "startAfter", "startAt");
	const queryConstraintFieldOptions = queryConstraintTypes.map((fieldName) => (
		{ value: fieldName, label: i18n(`constraint.${fieldName}`) }
	));

	const dynamicFieldTypes = ["msg", "flow", "global", "jsonata", "env"];
	const limitFieldTypes = [{ value: "num", label: "number", icon: "red/images/typedInput/09.svg", validate: FirebaseUI.validators.priority() }, ...dynamicFieldTypes];
	const rangeFieldTypes = ["bool", "num", "str", "date", { value: "null", label: "null", hasValue: false }, ...dynamicFieldTypes];

	const constraintUsedTypes = new Set();

	class EditableQueryConstraintsList {
		constructor() {
			this.containerId = "#node-input-constraints-container";
			this.containerClass = ".node-input-constraints-container-row";
			this.useConstraintsId = "#node-input-useConstraints";
			this.node = {};
		}

		#buildContainer() {
			this.container?.css({ "min-height": "150px", "min-width": "300px" }).editableList({
				addButton: i18n("addConstraint"),
				addItem: addItem,
				removable: true,
				sortable: true,
			});

			this.useConstraints?.on("change", () => this.#constraintsHandler());
		}

		#constraintsHandler() {
			// Legacy Config
			if (this.node.useConstraint !== undefined) {
				this.node.useConstraints = this.node.useConstraint;
				this.useConstraints?.prop("checked", this.node.useConstraints);
				delete this.node.useConstraint;
			}

			// Legacy Config
			if (this.node.constraint !== undefined) {
				this.node.constraints = migrateQueryConstraints(this.node.constraint);
				delete this.node.constraint;
			}

			if (this.useConstraints?.prop("checked") === true) {
				const constraints = Object.entries(this.node.constraints || {});

				if (!constraints.length) constraints.push(["limitToLast", { value: "5", type: "num" }]);

				constraints.forEach((item) => this.container?.editableList("addItem", item));
				this.containerRow?.show();
			} else {
				this.containerRow?.hide();
				this.container?.editableList("empty");
				constraintUsedTypes.clear();
			}

			RED.tray.resize();
		}

		build(node) {
			this.container = $(this.containerId);
			this.containerRow = $(this.containerClass);
			this.useConstraints = $(this.useConstraintsId);
			this.node = node;
			this.#buildContainer();
		}

		reSize(size) {
			let height = size.height;
			const rows = $(`#dialog-form>div:not(${this.containerClass})`);
			const editorRow = $(`#dialog-form>div${this.containerClass}`);

			for (let i = 0; i < rows.length; i++) {
				height -= $(rows[i]).outerHeight(true) || 0;
			}

			height -= (parseInt(editorRow.css("marginTop")) + parseInt(editorRow.css("marginBottom")));
			height += 16;
			this.container?.editableList("height", height);
		}

		saveItems() {
			const container = this.container?.editableList("items").sort(compareItemsList);
			const node = this.node;

			this.node.constraints = {};

			container?.each(function () {
				const constraintType = $(this).find("#node-input-constraint-type").typedInput("value");
				const value = $(this).find("#node-input-constraint-value").val();
				const child = $(this).find("#node-input-constraint-child").val();
				const childType = $(this).find("#node-input-constraint-child").typedInput("type");
				const valueType = $(this).find("#node-input-constraint-value").typedInput("type");

				switch (constraintType) {
					case "endAt":
					case "endBefore":
					case "equalTo":
					case "startAfter":
					case "startAt":
						if (valueType === "num" && Number.isNaN(Number(value || NaN))) RED.notify("Query Constraints: Setted value is not a number!", "error");

						node.constraints[constraintType] = { value: value, key: child, types: { value: valueType, child: childType } };
						break;
					case "limitToFirst":
					case "limitToLast": {
						const valueParsed = Number(value || NaN);
						if (valueType === "num" && (!Number.isInteger(valueParsed) || valueParsed <= 0)) RED.notify("Query Constraints: Setted value is not an integrer > 0!", "error");

						node.constraints[constraintType] = { value: value, type: valueType };
						break;
					}
					case "orderByChild":
						if (valueType === "str" && isChildValid(child, constraintType) !== true) RED.notify("Query Constraints: Setted value is not a valid child!", "error");

						node.constraints[constraintType] = { value: child, type: childType };
						break;
					case "orderByKey":
					case "orderByPriority":
					case "orderByValue":
						node.constraints[constraintType] = null;
						break;
				}
			});

			constraintUsedTypes.clear();
		}
	}

	function addItem(container, index, data) {
		const inputRows = $("<div></div>", { style: "flex-grow: 1" }).appendTo(container);
		const row = $("<div/>", { style: "width: 45%; vertical-align: top; display: inline-block;" }).appendTo(inputRows);
		const row2 = $("<div/>", { style: "width: calc(54% - 5px); margin-left: 5px; vertical-align: top; display: inline-block;" }).appendTo(inputRows);
		const row3 = $("<div/>", { class: "constraints-container-row-value" }).appendTo(row2);
		const constraintType = $("<input/>", { type: "text", id: "node-input-constraint-type", style: "width: 100%; text-align: center;" }).appendTo(row);
		const valueField = $("<input/>", { type: "text", id: "node-input-constraint-value", style: "width: 100%;", placeholder: i18n("placeholder.value") }).appendTo(row3);
		const childField = $("<input/>", { type: "text", id: "node-input-constraint-child", style: "width: 100%;", placeholder: i18n("placeholder.child") }).appendTo(row2);

		container.css({
			overflow: "auto",
			whiteSpace: "normal",
			display: "flex",
			"align-items": "center",
		});

		valueField.typedInput({ default: "num", typeField: "#node-input-constraint-valueType", types: ["num"] });
		childField
			.typedInput({
				default: "str",
				typeField: "#node-input-constraint-childType",
				types: [{ value: "str", label: "string", icon: "red/images/typedInput/az.svg", validate: (child, opt) => isChildValid(child, constraintType.val(), opt) }, ...dynamicFieldTypes]
			})
			.typedInput("hide");

		let previousValue;
		constraintType
			.typedInput({ type: "constraint", types: [{
					value: "constraint",
					options: queryConstraintFieldOptions,
					validate: function (value, opt) {	// Missing tooltip NR#5051
						constraintUsedTypes.delete(previousValue);
						if (constraintUsedTypes.has(value))
							return opt ? FirebaseUI._("errors.type-in-use", "load-config", "validator") : false;
						constraintUsedTypes.add(value);
						previousValue = value;
						return true;
					}
				}]
			})
			.on("change", (_event, _type, value) => updateTypeOfTypedInput(valueField, row3, childField, value))
			.typedInput("value", "orderByValue");

		// if known value (previously defined)
		if (Array.isArray(data)) {
			const [key, value] = data;

			const child = (key === "orderByChild" ? value?.value : value?.key) ?? "";
			const val = value?.value ?? "";
			const childType = (key === "orderByChild" ? value?.type : value?.types?.child) ?? "str";
			const valType = value?.types?.value ?? value?.type ?? "num";

			constraintType.typedInput("value", key);

			valueField.typedInput("value", val);
			valueField.typedInput("type", valType);
			childField.typedInput("value", child);
			childField.typedInput("type", childType);

			data = {};
			$(container).data("data", data);
		}

		data.index = index;
	}

	function compareItemsList(a, b) {
		return a.index - b.index;
	}

	function isChildValid(child, constraintType, opt) {
		const empty = constraintType !== "orderByChild";
		const validateChild = FirebaseUI.validators.child(empty);
		return validateChild(child, opt);
	}

	function isConstraintsValid() {
		return function (constraints, opt) {
			// Ensure label is setted
			// Workaround to pass label to typedInput validation
			opt ||= {};
			opt.label ||= FirebaseUI._("label.constraints", "firebase-in");

			if (typeof constraints !== "object") return false;

			for (const [k, v] of Object.entries(constraints)) {
				opt.label = FirebaseUI._(`constraint.${k}`, "load-config", "query-constraints");

				switch (k) {
					case "endAt":
					case "endBefore":
					case "equalTo":
					case "startAfter":
					case "startAt": {
						if (typeof v !== "object" || v === null) return FirebaseUI._("errors.no-object", "load-config", "validator");

						const valueFieldName = FirebaseUI._("placeholder.value", "load-config", "query-constraints");
						opt.label += ` (${valueFieldName})`;

						const valueTypeValidation = FirebaseUI.validators.valueType()(v.types?.value, opt);
						if (valueTypeValidation !== true) return valueTypeValidation;

						const valueValidation = FirebaseUI.validators.typedInput({ type: v.types?.value })(v.value, opt);
						if (valueValidation !== true) return valueValidation;

						const childFieldName = FirebaseUI._("placeholder.child", "load-config", "query-constraints");
						opt.label = opt.label.replace(/\(.*\)/, `(${childFieldName})`);

						const childTypeValidation = FirebaseUI.validators.childType()(v.types?.child, opt);
						if (childTypeValidation !== true) return childTypeValidation;

						const childValidation = FirebaseUI.validators.typedInput({ allowBlank: true, type: v.types?.child, typeField: "childType" })(v.key, opt);
						if (childValidation !== true) return childValidation;
						break;
					}
					case "limitToFirst":
					case "limitToLast": {
						// TODO: Remove me
						if (typeof v !== "object") return false;

						const validation = v.type === "num"
							? FirebaseUI.validators.priority()(v.value, opt)
							: FirebaseUI.validators.typedInput({ type: v.type })(v.value, opt);
						if (validation !== true) return validation;
						break;
					}
					case "orderByChild": {
						// TODO: Remove me
						if (typeof v !== "object") return false;

						const childTypeValidation = FirebaseUI.validators.childType()(v.type, opt);
						if (childTypeValidation !== true) return childTypeValidation;

						const validation = FirebaseUI.validators.typedInput({ type: v.type, typeField: "childType" })(v.value, opt);
						if (validation !== true) return validation;
						break;
					}
					case "orderByKey":
					case "orderByPriority":
					case "orderByValue":
						if (v !== null) return false;
						break;
					default:
						return FirebaseUI._("errors.invalid-type-prop", "load-config", "validator", { prop: k });
				}
			}

			return true;
		}
	}

	function migrateQueryConstraints(constraints) {
		return Object.entries(constraints).reduce((constraints, [constraintName, value]) => {
			switch (constraintName) {
				case "endAt":
				case "endBefore":
				case "equalTo":
				case "startAfter":
				case "startAt":
					if (value.type === "date" || value.type === "null") value.value = "";
					constraints[constraintName] = {
						value: String(value.value ?? ""),
						key: String(value.key || ""),
						types: { value: value.type, child: "str" },
					};
					break;
				case "limitToFirst":
				case "limitToLast":
					constraints[constraintName] = { value: String(value), type: "num" };
					break;
				case "orderByChild":
					constraints[constraintName] = { value: value, type: "str" };
					break;
				case "orderByKey":
				case "orderByPriority":
				case "orderByValue":
					constraints[constraintName] = null;
					break;
			}

			return constraints;
		}, {});
	}

	function updateTypeOfTypedInput(value, valueContainer, child, key) {
		// Initial state
		value.typedInput("show");
		valueContainer.css("padding-bottom", "0px");
		child.typedInput("hide");
		child.typedInput("value", "");

		switch (key) {
			case "endAt":
			case "endBefore":
			case "equalTo":
			case "startAfter":
			case "startAt":
				value.typedInput("types", rangeFieldTypes);
				valueContainer.css("padding-bottom", "5px");
				child.typedInput("show");
				break;
			case "limitToFirst":
			case "limitToLast":
				value.typedInput("types", limitFieldTypes);
				break;
			case "orderByChild":
				value.typedInput("hide");
				child.typedInput("show");
				break;
			case "orderByKey":
			case "orderByPriority":
			case "orderByValue":
				value.typedInput("hide");
				break;
		}
	}

	return {
		editableConstraintsList: { create: () => new EditableQueryConstraintsList() },
		validators: { isConstraintsValid },
	};
})();
