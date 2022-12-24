# Change log

## 0.2.0-beta.1

## Breaking Changes

- (Firebase in) Add more listeners (this node will need to be reconfigured)

## Changes

- Bump `firebase-admin` from 11.3.0 to 11.4.1
- The default label of nodes
- The icon of path

## Fixes

- (Firebase in) Do not remove the listener if it's still used in one or more nodes
- (Database) Regex rules for `apiKey` and `url`

### Improves

- `data-help` description for all nodes

### New Features

- (Database) Add an option to choose whether to create a new user (email)
- (Firebase get) Support for query constraints to sort and order data
- (Firebase out) Use `msg.method` to dynamically define the query

## 0.1.2

## Fixes

- Missing status when deploying modified nodes.

## Improves

- Adapt the node status in real time.
- Errors Handling.

## 0.1.1

## Fixes

- (Database) Crash if `API Key` is invalid.

## 0.1.0

## New Features

- (Database) `Private Key` (Firebase Admin Node.js SDK) authentication method.
- Tips and nodes descriptions.

## Fixes

- (Database) Crash if credentials are incorrect.

## 0.0.4

## Fixes

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
