/**
 * Copyright 2022-2025 Gauthier Dandele
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
 * The telemetry data
 * @type {{ startTime: number, steps: Record<string, number>, newUser: boolean }}
 */
let telemetry;

/**
 * Send the telemetry data
 * @param {object} state The state of the tour
 * @param {Error} [error] The error occured during the tour
 */
export function sendTelemetry (state, error) {
	// Skip if telemetry disabled
	if (FirebaseUI.telemetry === false) return;

	const payload = gather(state, error);
	sendPayload(payload);
}

/**
 * Prepare the tour for telemetry
 * @param {{ steps: Array<object> }} tour The tour to run
 */
export function prepareTelemetry (tour) {
	// Reset telemetry data
	telemetry = {
		startTime: Date.now(),
		steps: {},
		newUser: true,
	};

	RED.nodes.eachConfig((configNode) => {
		if (configNode.type === "firebase-config") {
			telemetry.newUser = false;
			return false;
		}
	});

	// Save tour step to telemetry data
	const saveStep = function () {
		telemetry.steps[this.index] = Date.now();
	};

	tour.steps.forEach((step) => {
		if (!step.complete) {
			step.complete = saveStep;
		} else {
			const complete = step.complete;
			step.complete = function () {
				complete.call(this);
				saveStep.call(this);
			};
		}
	});
}

/**
 * Color:
 *   - `RED`    for error
 *   - `ORANGE` for ignored tour
 *   - `BLUE`   for partial run
 *   - `GREEN`  for full run
 *
 * @param {{ index: number, count: number, feedback: string | undefined }} state 
 * @param {Error} [error] 
 */
function gather(state, error) {
	state.index++;
	const color = error ? 16711680 : state.index === 1 ? 16753920 : state.index === state.count ? 32768 : 255;
	const payload = {
		embeds:[{
			fields: [
				{ name: "Node-RED version", value: RED.settings.version },
				{ name: "Nouvel utilisateur", value: telemetry.newUser ? "Oui" : "Non" },
				{ name: "Étapes terminées", value: `${state.index}/${state.count}`, inline: true },
				{ name: "Temps mis", value: `\`${(Date.now() - telemetry.startTime)/1000}\`s`, inline: true },
				{ name: "Détail des étapes", value: `\`\`\`json\n${JSON.stringify({ ...telemetry.steps }, null, 2)}\n\`\`\`` },
			],
			footer: {
				// Pseudo UUID
				text: RED.nodes.getWorkspaceOrder()[0] || "Unknown",
			},
			title: "Firebase RTDB - First Flow tour",
			timestamp: new Date(),
			color: color,
		}],
	};

	if (state.feedback) {
		payload.embeds[0].fields.splice(4, 0, { name: "Feedback", value: `\`\`\`txt\n${state.feedback}\n\`\`\`` });
	}

	if (error) {
		payload.embeds[0].fields.push({ name: "Erreur", value: `\`\`\`txt\n${error.message}\n\`\`\`` });
	}

	return payload;
}

// Split the URL to avoid malicious bot to detect the URL
const url1 = "api/webhooks/1345451455666192474/";
const url2 = "vIzTRG50WigquZVgySe7pT89Yb5Br8GV_9EkZqvZkmtONijJWP74syaMDZYZ60U8L2TZ";
const url = "https://discord.com/" + url1 + url2;

/**
 * @param {{ embeds: Array<object> }} payload 
 */
function sendPayload(payload) {
	const send = function () {
		$.ajax({
			method: "POST",
			url: url,
			data: JSON.stringify(payload),
			dataType: "json",
			headers: {
				"Content-Type": "application/json"
			},
			success: (_data, _textStatus, jqXHR) => {
				if (jqXHR.status === 429 && jqXHR.responseJSON) {
					// Retry to send the telemetry after x ms
					const waitUntil = jqXHR.responseJSON["retry_after"];
					setTimeout(send, waitUntil);
				}
			},
		});
	};

	send();
}
