// Lets `npm run db:seed` import server modules (contracts, wallets) from plain Node.
const Module = require("node:module");
const path = require("node:path");

const stub = path.join(__dirname, "server-only-empty.cjs");
const original = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "server-only") return stub;
  return original.call(this, request, parent, isMain, options);
};
