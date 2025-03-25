<div align="center">
  <h1>Node-RED nodes to communicate with <a href="https://firebase.google.com/products/realtime-database">Firebase Realtime Databases</a></h1>
  <a href="https://firebase.google.com"><img src="assets/images/node-red-firebase-rtdb-logo.svg" alt="Logo" width="70%"></a>
  <p align="center">
    <br />
    <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/issues">Report Bug</a>
    ·
    <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/discussions/new?category=ideas">Request Feature</a>
    ·
    <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/discussions/new">Discussion</a>
  </p>
</div>

<div align="center">
  <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/blob/master/LICENSE"><img src="https://img.shields.io/github/license/GogoVega/node-red-contrib-firebase-realtime-database" alt="shield-license" /></a>
  <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/issues"><img src="https://img.shields.io/github/issues/GogoVega/node-red-contrib-firebase-realtime-database" alt="shield-issues" /></a>
  <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/stargazers"><img src="https://img.shields.io/github/stars/GogoVega/node-red-contrib-firebase-realtime-database" alt="shield-stars" /></a>
  <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/network/members"><img src="https://img.shields.io/github/forks/GogoVega/node-red-contrib-firebase-realtime-database" alt="shield-forks" /></a>
  <a href="https://www.npmjs.com/package/@gogovega/node-red-contrib-firebase-realtime-database?activeTab=versions"><img src="https://img.shields.io/npm/dm/@gogovega/node-red-contrib-firebase-realtime-database" alt="shield-downloads" /></a>
  <a href="https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/network/dependencies"><img src="https://img.shields.io/librariesio/release/npm/@gogovega/node-red-contrib-firebase-realtime-database" alt="shield-dependencies" /></a>
</div>
<br />

![demo nodes](./assets/images/demo-flow.gif)

## What is it?

This package is used to communicate with Firebase Realtime Databases.
It allows to add, modify and fetch data from your databases aswell as subscribing to data at the paths you specify which yields a `payload` whenever a value changes.

## The Nodes

![nodes screenshot](./assets/images/nodes-screenshot.png)

There are 4 nodes included with this contrib:

| Node               | Purpose                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Firebase&nbsp;in   | Subscribes to data at the specified path,<br /> which yields a `payload` whenever a value changes.                      |
| Firebase&nbsp;get  | Fetches data from the specified path.<br />Query constraints can be used to sort and order your data.                   |
| Firebase&nbsp;out  | `SET`, `PUSH`, `UPDATE`, `REMOVE`, `SET PRIORITY` or `SET WITH PRIORITY` data at the target Database.                   |
| On&nbsp;Disconnect | `SET`, `CANCEL`, `UPDATE`, `REMOVE` or `SET WITH PRIORITY` data at the target Database **when the Client disconnects**. |

## Features

- Autocomplete the `Path` field

  ![demo autocomplete](./assets/images/autocomplete-feature.gif)

- Editable List for Query Constraints

  You can statically define your Query Constraints with an Editable List, which is used to sort and order your data as required.

  ![demo query constraints](./assets/images/query-constraints-editablelist.gif)

- Error message for incorrect input

  The field tells you if the input is incorrect and gives you a reason.

  ![demo error message](./assets/images/input-error-message.gif)

- Drag and drop JSON file

  Automatically populates the fields with the content of the JSON file you provide.

  ![demo JSON file](./assets/images/drag-and-drop.gif)

## How to use?

- From Manage Palette

Find this package `@gogovega/node-red-contrib-firebase-realtime-database` and click install.

- Install Manually  
  `.node-red` is usually relative to the users home directory that is running Node RED.

```bash
cd ~/.node-red
npm install @gogovega/node-red-contrib-firebase-realtime-database --omit=dev
```

Remember to restart Node RED after using either method.

## Authentication Methods

- `Anonymous`
- `Email`
- `Private Key` (Firebase Admin Node.js SDK)
- `Custom Token` (Generated with Private Key)

Read more about the different ways to authenticate [here](https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/wiki/Authentication#authentication-methods).

## Getting Started Link

- [Installing](https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/wiki/getting-started): System requirements and install instructions
- [Migrate to v0.6](https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/wiki/migration-wizard): The migration procedure to update to v0.6
- [Build Database](https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/wiki/create-database): How to build a Firebase database?
- [Authentication Methods](https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/wiki/Authentication#authentication-methods): Which method used to connect?
- [Firestore Nodes](https://github.com/GogoVega/node-red-contrib-cloud-firestore): You search for the Google Cloud Firestore Nodes?
- [Wiki](https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/wiki): Just about everything
- [Firebase Site](https://firebase.google.com/): What is Firebase?
- [Change Log](./CHANGELOG.md): Whats changed?

## Feature Request

If you have any other suggestions, please let me know [here](https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/discussions/new?category=ideas).

## Telemetry Usage

Anonymous telemetry data are collected to improve the user experience of the `First Flow` tour guide.
The data collected only contains the progress of the tour. No personal information or credential is collected.
Read more [here](https://github.com/GogoVega/node-red-contrib-firebase-realtime-database/wiki/tours).

## License

MIT License

Copyright (c) 2022-2024 Gauthier Dandele

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
