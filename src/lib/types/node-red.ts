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

import { Exec } from "@gogovega/firebase-config-node/utils";

// Helper Types of internal NR methods

interface ModuleInfo {
	nodes: Record<string, object>[];
	plugins: Record<string, object>[];
	version: string;
}

export interface Util {
	readonly exec: Exec;
}

export interface Registry {
	addModule(name: string): Promise<ModuleInfo>;
	getModuleInfo(name: string): ModuleInfo | null;
	removeModule(name: string, skipSave?: boolean): { id: string }[];
}
