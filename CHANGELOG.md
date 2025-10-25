# Change log

## 0.8.2

### Changes

- Bump `@gogovega/firebase-config-node` from 0.3.1 to 0.3.2 (#121)
  - Bump dependencies to latest
  - Several fixes and improvements (https://github.com/GogoVega/Firebase-Config-Node/releases/tag/v0.3.2)

### Fixes

- Node loading due to async resource loading (#117)

## 0.8.1

### Changes

- Bump `@gogovega/firebase-config-node` from 0.3.0 to 0.3.1 (#104)
  - Bump dependencies to latest
- Move content from `load-config` messages to `firebase-in` messages (#106)
- Remove the `load-config` node (#107)

### Enhances

- Experimental: Force load config node to avoid restarting NR (#108)

### Fixes

- Remove the config node module when uninstalling the Palette (#104)
- Handle NR beta version (https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/commit/bf1d43da2fcf02145518a61dcc254e7b44502b52)

### Improves

- Move the Migration Wizard to a plugin (#102)
- Move the Tours Runner to a plugin (#103)
- Move the Config Node Checker to a Plugin (#104)

## 0.8.0

### Breaking Changes

- Set required version of Node.js to >=20 (#99)

### Changes

- Bump `@gogovega/firebase-config-node` from 0.2.6 to 0.3.0 (#99)
  - Bump dependencies to latest ([#33](https://github.com/GogoVega/Firebase-Config-Node/pull/33))

## 0.7.7

### Changes

- Bump `@gogovega/firebase-config-node` from 0.2.5 to 0.2.6
  - Bump dependencies to latest ([#26](https://github.com/GogoVega/Firebase-Config-Node/pull/26))
- Update the dependency versioning (#97)

## 0.7.6

### Changes

- Bump `@gogovega/firebase-config-node` from 0.2.4 to 0.2.5
  - Bump dependencies to latest

### Fixes

- Fix and improve the `tourGuide` runner (#94)

## 0.7.5

### Changes

- Bump `@gogovega/firebase-config-node` from 0.2.3 to 0.2.4
  - Fix `got` dependency missing - replaced by `axios` ([#22](https://github.com/GogoVega/Firebase-Config-Node/pull/22))

## 0.7.4

### Changes

- Bump `@gogovega/firebase-config-node` from 0.2.2 to 0.2.3
  - Using RTDB status must validate database URL
  - Silent error when getting RTDB Setting

### Fixes

- The Firebase IN node input calculator

### Improves

- The `tourGuide` runner (for concurrent calls)

## 0.7.3

### Changes

- (Firebase IN) Offers all types to the `Path` field by default (#83)
- Bump `@gogovega/firebase-config-node` from 0.2.1 to 0.2.2
  - Allow UI to set the RTDB `defaultWriteSizeLimit` setting ([#18](https://github.com/GogoVega/Firebase-Config-Node/pull/18))

### Enhances

- (Query Constraint) Mark select input as error if constraint already used (#85)
- Allow `msg.listener` to unsubscribe from data (#86)
- Add new node statuses to improve tracking (#87)
- Improve the node status and add Waiting status (#88)

### Improves

- Avoid Node Messaging timeout (#84)
- Slight cleanup and move some Firebase class properties to static

## 0.7.2

### Changes

- Update the `Confirm Update` msg (for pinned node versions)

### Improves

- The `First flow` tour guide (#81)

## 0.7.1

### Changes

- Bump `@gogovega/firebase-config-node` from 0.2.0 to 0.2.1
  - Do not call `signout` if app initialization failed ([#15](https://github.com/GogoVega/Firebase-Config-Node/pull/15))
  - Fix bad `Query` object returned by `applyQueryConstraints` ([#16](https://github.com/GogoVega/Firebase-Config-Node/pull/16))

### Enhances

- Introduce the `First flow` tour guide (#79)

## 0.7.0

### Breaking Changes

- Set required version of Node.js to >=18

### Changes

- Bump `@gogovega/firebase-config-node` from 0.1.5 to 0.2.0
  - Only don't wait signout for Firestore and add a safety delay ([#12](https://github.com/GogoVega/Firebase-Config-Node/pull/12))
  - Set required version of Node.js to >=18
  - Set required version of Node-RED to >=3

## 0.6.0

### Breaking Changes

- The type of config-node (`database-config`) has changed to `firebase-config`.

> [!CAUTION]
> This change breaks the runtime - it must be resolved to start the flows.
> See more about the [reason](https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/pull/50) and the [migration procedure](https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/wiki/Migration-Wizard).

### Deprecated Features

- (Firebase GET & IN) `msg.method` replaced by `msg.constraints`

> [!WARNING]
> This and other minor changes in the edit box are NON-breaking changes.
> They are resolved automatically when you save a node. The Migration Wizard resolves them too.

### Changes

- (QueryConstraints) `constraint` and `msg.method` are deprecated (#57)
- Only allows installations on Node RED version >=3 ([7120f4e](https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/commit/7120f4e4efcd24c5fb63664d7c1c9e41ac2738b5))
- Update Firebase icon
- Move all `name` fields to the top of the edit box (#72)

### New Features

- Support to dynamically set `Firebase-in` node properties (#54)
- A new option has been added to the `Output` field so that the data is in JSON format (#58)
- `flow`, `global` and `jsonata` options has been added to the `Path` field for all nodes (#59)
- QueryConstraints: `msg`, `flow`, `global` and `jsonata` as new types for the `Value` field and the `Child` field (#61)
- (ServerValue) Relax Integer rule to Number and add `DECREMENT` keyword (#63)
- Feature: Add `env` field type to `Path`, `Child` and `Value` inputs (#66)

### Enhancements

- Better use of [Node Messaging API](https://github.com/node-red/designs/blob/master/designs/node-messaging-api.md) (part of #53)
- Input validation error message (#56)
- Add `autocomplete` to all Path fields (#60)

### Refactors

- Config Node Externalization (#53)
- Use resources for editor to remove duplicates (#55)

### Fixes

- The value of the `date` option for the field type (#69)
- Remove the deprecated `fetchSignInMethodsForEmail` function ([#11](https://github.com/GogoVega/Firebase-Config-Node/pull/11))

## 0.5.5

### Changes

- Bump dependencies to latest
- Restrict all `firebase` versioning to patch

## 0.5.4

### Changes

- Reduce `firebase` dependencies size by only used sub-dependencies
- Bump new dependencies to latest
- Bump `firebase-admin` from 11.11.0 to 12.0.0

## 0.5.3

### Changes

- Bump `firebase` from 10.3.1 to 10.5.0
- Bump `firebase-admin` from 11.10.1 to 11.11.0

### Enhancements

- Support for built-in `TIMESTAMP` and `increment` server values (#51)
- Update examples to support `ServerValue` (#51)

### Fixes

- Invalid `API Key` input pattern (#49)

## 0.5.2

### Changes

- Bump `firebase` from 9.21.0 to 10.3.1
- Bump `firebase-admin` from 11.8.0 to 11.10.1

### Enhancements

- Improve `Demo Flow` and add `On Disconnect Flow` and `Advanced Flow` examples

## 0.5.1

### Changes

- Bump `firebase` from 9.20.0 to 9.21.0
- Bump `firebase-admin` from 11.7.0 to 11.8.0

### Enhancements

- German translation

## 0.5.0

### Changes

- Bump `firebase` from 9.19.1 to 9.20.0
- Bump `firebase-admin` from 11.5.0 to 11.7.0

### Fixes

- Errors in the description of message properties (data-help)
- (database) No longer create the credential `json` for new configs (deprecated field)
- Child key for `Range Queries` can be empty (undefined)
- Child key for `Range Queries` is not saved correctly
- Saved value of `Range Queries` does not have the correct type (always string)
- `Query Constraints` accepts null as value for Range Queries
- (database) Options allowed for `Additional Claims` are `string`, `number`, `boolean`, `date` and `json`
- (database) Saved value for `Additional Claims` does not have the correct type (always string)

### Improves

- The style of `Query Constraints` container (alignment of fields)
- You can now use the path as an object (Path field)

### New Features

- `On Disconnect` Node
- (database) Validation of `Additional Claims` (does the value match the type and the key is it allowed)
- (database) A notification is sent if the value of field `Value` is incorrect
- (Firebase-get) Options `date`, `flow`, `global`, `msg` and `null` have been added
- (Firebase-in) Options `date` and `null` have been added
- (Firebase-get & Firebase-in) Validation of `Query Constraints` (does the value match the type and the child is it allowed)
- (Firebase-get & Firebase-in) A notification is sent if the value of field `Value` is incorrect

## 0.4.0

### Changes

- Bump `firebase` from 9.17.2 to 9.19.1

### Fixes

- Send `null` payload if no data for the configured path
- (database) Message properties for data help
- Waits the end of log in before running stuff
- Drop frame (label missing and scroll issue)

### New Features

- (Firebase get) Option to pass through the message
- Sign In with Custom Token (generated with Private Key)

### Refactors

- Use `applyQueryConstraints` for both databases (overload method)

## 0.3.1

### Changes

- Bump `firebase` from 9.17.1 to 9.17.2

### Fixes

- Clear `Permission Denied` Status for `Firebase-out` Node (#25)
- `typedInput` for `Query Constraint` container (#24)

## 0.3.0

### Changes

- Bump `firebase` from 9.14.0 to 9.17.1
- Bump `firebase-admin` from 11.4.1 to 11.5.0
- Uses two new entries for authentication with Private Key

### Fixes

- `validate` function for typedInput (input do not turn red and regex rules)
- Firebase default app already exists error

### New Features

- New node status (+ error code)
- Unused connection management
- Support for `setPriority` and `setWithPriority` queries
- `EditableList` to set Query Constraint in `firebase-get` node
- Support Query Constraint for Listener (`EditableList`)
- Drag and drop file to set `Private Key` and `Client Email` entries
- Support Asia (Southeast) Database URL
- Internationalisation

### Refactors

- Transition the codebase to TypeScript
- Node status and error handling

## 0.2.0

### Breaking Changes

- (Firebase in) Add more listeners (this node will need to be reconfigured)

### Changes

- Bump `firebase-admin` from 11.3.0 to 11.4.1
- The default label of nodes
- The icon of path

### Fixes

- (Firebase in) Do not remove the listener if it's still used in one or more nodes
- (Database) Regex rules for `apiKey` and `url`

### Improves

- `data-help` description for all nodes

### New Features

- (Database) Add an option to choose whether to create a new user (email)
- (Firebase get) Support for query constraints to sort and order data
- (Firebase out) Use `msg.method` to dynamically define the query

## 0.1.2

### Fixes

- Missing status when deploying modified nodes.

### Improves

- Adapt the node status in real time.
- Errors Handling.

## 0.1.1

### Fixes

- (Database) Crash if `API Key` is invalid.

## 0.1.0

### New Features

- (Database) `Private Key` (Firebase Admin Node.js SDK) authentication method.
- Tips and nodes descriptions.

### Fixes

- (Database) Crash if credentials are incorrect.

## 0.0.4

### Fixes

- (Firebase get) Error the path received is not a string.
- (Database) Error while authenticating with email.
- (Database) Sign Out before delete App.

## 0.0.3

### Fixes

- `demo-flow` example not updated with new `database-config` node

## 0.0.2

### Breaking Changes

- `database` name to `database-config` because already used

### Changes

- Node category and color of nodes

### New Features

- Add regex rules for input fields

## 0.0.1

- Initial commit
