const { red, redBright, blueBright } = require("ansi-colors");
const fetch = require("node-fetch");
const fs = require("fs");
const spawn = require("cross-spawn");
const consts = require("./constants");

//
// Cache
//

const cache = new Map();

//
// Error utils
//

function error(message) {
  console.error(red(message));
  process.exit(1);
}
module.exports.error = error;

//
// Download utils
//

async function download(url, dest, kill = false) {
  const res = await fetch(url);
  if (!res.ok) {
    console.log(url);
    console.log(
      redBright(`Server responded with ${res.status}: ${res.statusText}`)
    );
    if (kill)
      return error(`Server responded with ${res.status}: ${res.statusText}`);
    console.log(blueBright("\nRetrying..!\r"));
    return download(url, dest, true);
  }
  const fileStream = fs.createWriteStream(dest);
  return await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
}
module.exports.download = download;

//
// Base URL
//

const domain =
  "https://raw.githubusercontent.com/GmBodhi/create-three-app/master/";

module.exports.domain = domain;

//
// Get Config
//

async function getConfig() {
  if (cache.has(consts.pathTypes.BASIC))
    return cache.get(consts.pathTypes.BASIC);
  const res = await fetch(domain + "config.json").then((res) => res.json());
  cache.set(consts.pathTypes.BASIC, res);
  return res;
}
module.exports.getConfig = getConfig;

//
// Check for Yarn
//

module.exports.checkYarn = function checkYarn() {
  return new Promise((resolve) => {
    spawn("yarn", ["--version"], { stdio: "ignore" })
      .on("close", (code) => {
        if (code !== 0) resolve("npm");
        resolve("yarn");
      })
      .on("error", () => {
        resolve("npm");
      });
  });
};

//
// Resolve URL
//

module.exports.resolveUrl = function resolveUrl(
  domain,
  { url, example },
  file,
  type
) {
  const path = () => {
    return type === consts.pathTypes.EXAMPLE
      ? "example-processor/templates/"
      : type === consts.pathTypes.BASIC
      ? "examples/"
      : "utils/";
  };
  return `${domain}${path()}${example}/${url ? url + "/" : ""}${file}`;
};

//
// Check whether a directory is empty
//

module.exports.dirIsEmpty = (dir) => fs.readdirSync(dir).length === 0;

//
// Check for new version
//

module.exports.checkForUpdates = async function checkForUpdates() {
  const res = await fetch(
    "https://registry.npmjs.org/-/package/create-three-app/dist-tags"
  ).then((r) => r.json());
  const current = require("../../package.json").version;
  if (res.latest !== current)
    return error(
      `You current version (${current}) need to be updated to ${res.latest}\n We don't support global installs.`
    );
  return;
};
