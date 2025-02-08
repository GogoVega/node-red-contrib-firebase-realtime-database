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

/**
 * First Flow tour guide for creating a Firebase flow in Node-RED.
 *
 * This module exports an object that defines a series of steps for a guided tour
 * to help users create their first Firebase flow in Node-RED. Each step includes
 * a title, description, and actions to be performed.
 */
export default {
	steps: [
		{
			titleIcon: "fa fa-map-o",	// TODO: Firebase icon
			title: {
				"en-US": "Create your first Firebase flow",
				"fr": "Créer votre premier flux Firebase"
			},
			width: 400,
			description: {
				"en-US": "This tutorial will guide you through creating your first Firebase flow.",
				"fr": "Ce didacticiel vous guidera dans la création de votre premier flux Firebase."
			}
		},
		{
			element: "#red-ui-palette-base-category-Firebase",
			direction: "right",
			description: {
				"en-US": "The Firebase palette lists all of the nodes available to use.",
				"fr": "La palette Firebase répertorie tous les noeuds disponibles à utiliser."
			},
			prepare: function (done) {
				// Show only the Firebase category - to avoid to freeze the workspace
				// RED.palette doesn't allow this sort of filter so it's a trick 🤫
				$("#red-ui-palette .red-ui-palette-header").closest(".red-ui-palette-category").hide();
				$("#red-ui-palette-header-Firebase").closest(".red-ui-palette-category").show();
				setTimeout(done, 200);
			},
			complete: function () {
				// Clear the Firebase filter to returns to previous Palette state
				$("#red-ui-palette-search input").searchBox("value", "pending");
				$("#red-ui-palette-search input").searchBox("value", "");
			}
		},
		{
			element: "#red-ui-tab-red-ui-clipboard-dialog-import-tab-examples",
			direction: "bottom",
			description: {
				"en-US": "<p>Let's import a flow of examples. Click on the '<strong>Examples</strong>' button.</p>",
				"fr": "<p>Importons un flux d'exemples. Cliquer sur le bouton '<strong>Exemples</strong>'.</p>"
			},
			fallback: "inset-bottom-right",
			wait: {
				type: "dom-event",
				event: "click",
			},
			prepare: function (done) {
				RED.actions.invoke("core:show-import-dialog");
				setTimeout(done, 200);
			}
		},
		{
			element: "#red-ui-clipboard-dialog-ok",
			direction: "top",
			description: {
				"en-US": "<p>Select the '<strong>demo-flow</strong>' example and import it.</p>",
				"fr": "<p>Sélectionner l'exemple '<strong>demo-flow</strong>' et importer le.</p>"
			},
			fallback: "inset-bottom-right",
			wait: {
				type: "dom-event",
				event: "click",
			},
			prepare: function (done) {
				// Expand the RTDB examples
				$("#red-ui-clipboard-dialog-import-tab-examples ol")
					.find(".red-ui-editableList-item-content .red-ui-treeList-label")
					.filter(function () {
						return $(this).text().trim() === "@gogovega/node-red-contrib-firebase-realtime-database";
					})
					.trigger("click");
				setTimeout(done, 200);
			}
		},
		{
			element: "#red-ui-sidebar-config-category-global ul .red-ui-palette-node_id_e8796a1869e179bc",
			direction: "left",
			description: {
				"en-US": "<p>Double-click on the '<strong>My Database</strong>' configuration node to open it.</p>",
				"fr": "<p>Double-cliquer sur le noeud de configuration '<strong>My Database</strong>' pour l'ouvrir.</p>"
			},
			fallback: "inset-bottom-right",
			wait: {
				type: "nr-event",
				event: "editor:open",
				filter: function () {
					// Ensures it's the right config node being opened
					return RED.editor.getEditStack()[0]?.id === "e8796a1869e179bc";
				}
			},
			prepare: function (done) {
				// Highlight the config node
				RED.sidebar.config.show("e8796a1869e179bc");
				setTimeout(done, 300);
			}
		},
		{
			element: "#node-config-input-authType",
			direction: "bottom",
			description: {
				"en-US": `
					<p>Select the authentication method, complete the required fields and finish by saving your changes.</p>
					<p>Each field has a ℹ️ icon to help you to complete it. In addition, each node contains documentation in the <strong>Help</strong> tab of the Sidebar on your right.</p>`,
				"fr": `
					<p>Sélectionner la méthode d'authentification, compléter les champs requis et terminer par sauver vos modifications.</p>
					<p>Chaque champ dispose d'une icone ℹ️ pour vous aider à le compléter. De plus, chaque noeud contient une documentation dans l'onglet <strong>Aide</strong> de la Sidebar à votre droite.</p>`
			},
			fallback: "inset-bottom-left",
			width: 500,
			wait: {
				type: "nr-event",
				event: "editor:save",
				filter: function (event) {
					// Ensures it's the right config node being saved
					return event.id === "e8796a1869e179bc";
				}
			},
			prepare: function (done) {
				// Timeout needed to prepare the edit dialog
				setTimeout(function () {
					RED.sidebar.help.show("firebase-config");
					done();
				}, 500);
			}
		},
		{
			element: "#red-ui-header-button-deploy",
			description: {
				"en-US": "Deploy your changes so the flow is active in the runtime.",
				"fr": "Déployer vos modifications afin que le flux soit actif dans le runtime."
			},
			wait: {
				type: "dom-event",
				event: "click"
			},
			prepare: function (done) {
				RED.workspaces.show("13c4e8e8f85d50b9");
				RED.sidebar.show("debug");
				setTimeout(done, 300);
			}
		},
		{
			title: {
				"en-US": "Now it's your turn",
				"fr": "A vous de jouer maintenant"
			},
			description: {
				"en-US": `
					<p>This flow will introduce you to the basic usage of nodes. Enjoy exploring!</p>
					<p>I hope this tutorial helped you... feel free to send me your <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/discussions/new?category=ideas">comments <i class="fa fa-external-link-square"></i></a> to improve it 🙂</p>`,
				"fr": `
					<p>Ce flux d'exemples vous fera découvrir l'utilisation basique des noeuds. Bonne découverte!</p>
					<p>J'espère que ce didacticiel vous a aidé... n'hésitez pas à me transmettre vos <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/discussions/new?category=ideas">remarques <i class="fa fa-external-link-square"></i></a> pour l'enrichir 🙂</p>`
			},
			width: 400
		}
	],
}
