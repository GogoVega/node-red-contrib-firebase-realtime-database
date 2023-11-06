#!/usr/bin/env node

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
