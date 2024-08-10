# Change log

## 0.6.0-beta.3

### Changes

- Bump `@gogovega/firebase-config-node` from 0.0.1-beta.2 to 0.0.1
- Only allows installations on Node RED version >=3
- Update Firebase icon

## Fixes

- Typos with `msg.method` instead of `msg.constraints`
- Update documentation for `DECREMENT` reserved keyword
- Migration: the error is not transmitted to the console

## 0.6.0-beta.2

### Changes

- Bump `@gogovega/firebase-config-node` from 0.0.1-beta.1 to 0.0.1-beta.2

### Fixes

- Fix the value of the date option for the field type (#69)
- Add missing `env` to config types

### Improvements

- Avoid issuing both installation and migration notifications (#70)

## 0.6.0-beta.1

### Changes

- Use the new unified `DataSnapshot` structure
- Allow the path to have spaces in the name
- Bump devDependencies and dependencies to latest

### New Features

- (ServerValue) Relax Integer rule to Number and add `DECREMENT` keyword (#63)
- Feature: Add `env` field type to `Path`, `Child` and `Value` inputs (#66)

### Enhancements

- Clean up nodes history during migration
- Improve the autocomplete of `Path` field (#67)
- Ensure scripts have been loaded (#68)

## 0.6.0-alpha.2

### Fixes

- Migration script and Installation script call

## 0.6.0-alpha.1

### Breaking Changes

- The type of config-node (`database-config`) is changed to `firebase-config`

> [!CAUTION]
> This type change breaks the runtime - it must be resolved to start the flows

### New Features

- QueryConstraints: `msg`, `flow`, `global` and `jsonata` as new types for the `Value` field and the `Child` field
- `flow`, `global` and `jsonata` options has been added to the `Path` field for all nodes.
- A new option has been added to the `Output` field so that the data is in JSON format.
- Support to dynamically set `Firebase-in` node properties

### Enhancements

- Add autocomplete to all Path fields
- Validation error message

### Changes/Refactors

- Use resources for editor to remove duplicates
- Config Node Externalization (see #50)

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
