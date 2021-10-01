const fetch = require("node-fetch");

const json = require("../../package.json");

module.exports.checkForUpdates = async function () {
  let data = await fetch(
    "https://registry.npmjs.org/-/package/create-three-app/dist-tags"
  ).then((r) => r.json());

  if (json.version !== data.latest) return console.log("");
};
