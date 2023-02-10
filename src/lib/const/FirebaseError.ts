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

export const firebaseError: Record<string, string> = {
	"auth/api-key-not-valid": "Please check your API key.",
	"auth/invalid-credential": "Please check your JSON Credential",
	"auth/invalid-database-url": "Please check your database URL",
	"auth/invalid-email": "The format of your email address is incorrect.",
	"auth/network-request-failed": "No Network: Please check your network",
	"auth/unknown-email": "Please check your email address or select 'create a new user'",
	"auth/wrong-password": "Wrong Password: Please check your password.",
};
