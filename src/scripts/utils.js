import * as ansiColors from "ansi-colors";
import fetch from "node-fetch";
import fs from "fs";
import spawn from "cross-spawn";
import consts from "./constants";
import { version } from "../../package.json";

//
// Cache
//

const cache = new Map();

//
// Error utils
//

function error(message) {
  console.error(ansiColors.red(message));
  process.exit(1);
}

//
// Download utils
//

async function download(url, dest, kill = false) {
  const res = await fetch(url, null);
  if (!res.ok) {
    console.log(url);
    console.log(
      ansiColors.redBright(
        `Server responded with ${res.status}: ${res.statusText}`
      )
    );
    if (kill)
      return error(`Server responded with ${res.status}: ${res.statusText}`);
    console.log(ansiColors.blueBright("\nRetrying..!\r"));
    return download(url, dest, true);
  }
  const fileStream = fs.createWriteStream(dest);
  return await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
}

//
// Base URL
//

const domain =
  "https://raw.githubusercontent.com/GmBodhi/create-three-app/master/";

//
// Get Config
//

async function getConfig() {
  if (cache.has(consts.pathTypes.BASIC))
    return cache.get(consts.pathTypes.BASIC);
  const res = await fetch(domain + "config.json", null).then((res) =>
    res.json()
  );
  cache.set(consts.pathTypes.BASIC, res);
  return res;
}

//
// Check for Yarn
//

const checkYarn = function checkYarn() {
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

const resolveUrl = function resolveUrl(domain, { url, example }, file, type) {
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

const dirIsEmpty = (dir) => fs.readdirSync(dir).length === 0;

//
// Check for new version
//

const checkForUpdates = async function checkForUpdates() {
  const res = await fetch(
    "https://registry.npmjs.org/-/package/create-three-app/dist-tags",
    null
  ).then((r) => r.json());
  version;
  if (res.latest !== version)
    return error(
      `You current version (${version}) need to be updated to ${res.latest}\n We don't support global installs.`
    );
  return;
};

export {
  error,
  download,
  domain,
  getConfig,
  checkYarn,
  resolveUrl,
  dirIsEmpty,
  checkForUpdates,
};
