#!/usr/bin/env node

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

const notice = `
If this is the first installation of this module you can ignore the following:

If you are upgrading from version <=0.5 to >=0.6, please go to your node-red folder and run:
  cd ~/.node-red/node_modules/@gogovega/node-red-contrib-firebase-realtime-database
  npm run migrate

This command runs a migration wizard needed to resolve the 'missing type' error.

Don't forget to add '--' before the first argument, e.g. npm run migrate -- --help

Read more about this migration wizard at https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/discussions/50
`;

console.log(notice);
