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
const tour = {
	steps: [
		{	// TODO: go through a class for icon
			titleIcon: 'firebase"><img src="/icons/@gogovega/node-red-contrib-firebase-realtime-database/firebase.svg',
			title: {
				"en-US": "Create your first Firebase flow",
				"fr": "Créer votre premier flux Firebase"
			},
			width: 400,
			description: {
				"en-US": "This tutorial will guide you through creating your first Firebase flow.",
				"fr": "Ce didacticiel vous guidera dans la création de votre premier flux Firebase."
			},
			prepare: function () {
				// Ensure all trays are closed
				RED.tray.close();

				const that = this;
				const url = "https://gogovega.github.io/firebase-tours/rtdb/telemetry.js";
				// TODO: Remove me
				if (!FirebaseUI._telemetrySupported) {
					import(url).then(function (telemetry) {
						telemetry.prepareTelemetry(tour);
						// Send telemetry when the tour has finished
						$(".red-ui-tourGuide-shade").one("remove", function () {
							telemetry.sendTelemetry(that);
						});
					});
				}
			}
		},
		{
			element: "#red-ui-palette-base-category-Firebase",
			direction: "right",
			description: {
				"en-US": "The Firebase palette lists all of the nodes available to use. Lets explore them.",
				"fr": "La palette Firebase répertorie tous les noeuds disponibles à utiliser. Prenons un moment pour les découvrir."
			},
			prepare: function (done) {
				// Show only the Firebase category - to avoid to freeze the workspace
				// RED.palette doesn't allow to sort by category so it's a trick 🤫
				const filter = $("#red-ui-palette-search input");
				this.paletteFilter = filter.searchBox("value");
				filter.searchBox("value", "");
				setTimeout(function () {
					$("#red-ui-palette .red-ui-palette-header").closest(".red-ui-palette-category").hide();
					$("#red-ui-palette-header-Firebase").closest(".red-ui-palette-category").show();
					done();
				}, 200);
			}
		},
		{
			element: ".red-ui-palette-node[data-palette-type='firebase-in']",
			direction: "right",
			title: {
				"en-US": "The Firebase In Node",
				"fr": "Le noeud Firebase In"
			},
			description: {
				"en-US": "This node subscribes to data at the specified path and sends a payload for each change.",
				"fr": "Ce noeud s'abonne aux données du chemin spécifié et envoie une charge utile pour chaque changement."
			}
		},
		{
			element: ".red-ui-palette-node[data-palette-type='firebase-get']",
			direction: "right",
			title: {
				"en-US": "The Firebase Get Node",
				"fr": "Le noeud Firebase Get"
			},
			description: {
				"en-US": "This node reads the data from the specified path and sends a payload.",
				"fr": "Ce noeud lit les données du chemin spécifié et envoie une charge utile."
			}
		},
		{
			element: ".red-ui-palette-node[data-palette-type='firebase-out']",
			direction: "right",
			title: {
				"en-US": "The Firebase Out Node",
				"fr": "Le noeud Firebase Out"
			},
			description: {
				"en-US": "This node modifies the data at the specified path.",
				"fr": "Ce noeud modifie les données du chemin spécifié."
			}
		},
		{
			element: ".red-ui-palette-node[data-palette-type='on-disconnect']",
			direction: "right",
			width: 400,
			title: {
				"en-US": "The On-Disconnect Node",
				"fr": "Le noeud On-Disconnect"
			},
			description: {
				"en-US": "This node modifies the data at the specified path only when a connection loss occurs between Node-RED and Firebase.",
				"fr": "Ce noeud modifie les données du chemin spécifié uniquement lors d'une perte de connexion entre Node-RED et Firebase."
			},
			complete: function () {
				// Clear the Firebase filter to returns to previous Palette state
				$("#red-ui-palette-search input").searchBox("value", "pending");
				$("#red-ui-palette-search input").searchBox("value", this.paletteFilter || "");
			}
		},
		{
			element: "#red-ui-tab-red-ui-clipboard-dialog-import-tab-examples",
			direction: "bottom",
			width: 400,
			title: {
				"en-US": "Let's import a flow of examples",
				"fr": "Importons un flux d'exemples"
			},
			description: {
				"en-US": "<p>Click on the '<strong>Examples</strong>' button.</p>",
				"fr": "<p>Cliquer sur le bouton '<strong>Exemples</strong>'.</p>"
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
					<p>I hope this tutorial helped you... feel free to send me your comments on <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/discussions/new?category=ideas" title="open GitHub">GitHub <i class="fa fa-external-link-square"></i></a> to improve it 🙂</p>
					<textarea id="tour-input-submit-feedback" placeholder="Or send me your comments anonymously by writing them here..." style="width: 100%;" maxlength="1000"></textarea>`,
				"fr": `
					<p>Ce flux d'exemples vous fera découvrir l'utilisation basique des noeuds. Bonne découverte!</p>
					<p>J'espère que ce didacticiel vous a aidé... n'hésitez pas à me transmettre vos remarques sur <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/discussions/new?category=ideas" title="ouvrir GitHub">GitHub <i class="fa fa-external-link-square"></i></a> pour l'enrichir 🙂</p>
					<textarea id="tour-input-submit-feedback" placeholder="Ou transmettez-moi vos remarques de manière anonyme en les écrivant ici..." style="width: 100%; " maxlength="1000"></textarea>`
			},
			width: 400,
			complete: function () {
				this.feedback = $("#tour-input-submit-feedback").val();
			}
		}
	],
};

export default tour;
