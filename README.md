# node-red-contrib-firebase-realtime-database

Node-RED nodes to communicate with [Firebase Realtime Database](https://firebase.google.com/).

![demo nodes](./docs/images/demo-nodes.png)

## What is it?

This package is used to communicate with Firebase Realtime Database.
It allows to add, modify and get data from database and also to subscribe to data in the specified path which sends a message whenever a value changes.

## The Nodes

![nodes screenshot](./docs/images/nodes-screenshot.png)

There are 3 node included with this contrib:

- `Firebase in`: Subscribes to data in the specified path which sends a message whenever a value changes.
- `Firebase get`: Get data from specified path.
- `Firebase out`: `SET`, `PUSH`, `UPDATE` or `REMOVE` data to Database.

## How to use?

- From Manage Palette

Find this package `@gogovega/node-red-contrib-firebase-realtime-database` and click install.

- Install Manually

```bash
cd ~/.node-red
npm install @gogovega/node-red-contrib-firebase-realtime-database
node-red
```

## Authentication Methods

- `Anonymous`
- `Email`
- `Private Key`

Read more about the different ways to authenticate [here](./docs/Authentication.md).

## Future Features

- Sign in with Custom Token

## Getting Started Link

- [Authentication Methods](./docs/Authentication.md): Which method used to connect?
- [Firebase Site](https://firebase.google.com/): What is Firebase?

## License

MIT License

Copyright (c) 2022 Gauthier Dandele

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
