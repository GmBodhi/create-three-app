const chalk = require("chalk");
const fetch = require("node-fetch");
const fs = require("fs");
const spawn = require("cross-spawn");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

//
// Cache
//

const cache = new Map();

//
// Constants
//

const consts = {
  // Type of the template
  pathTypes: {
    UTILS: 0,
    EXAMPLE: 1,
    BASIC: 2,
  },
};

module.exports.consts = consts;

//
// Error utils
//

function error(message) {
  console.error(chalk.red(message));
  process.exit(1);
}
module.exports.error = error;

//
// Download utils
//

async function download(url, dest) {
  const res = await fetch(url, {});
  if (!res.ok) {
    console.log(url);
    return error(`Server responded with ${res.status}: ${res.statusText}`);
  }
  const fileStream = fs.createWriteStream(dest);
  await new Promise((resolve, reject) => {
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
  "https://raw.githubusercontent.com/GmBodhi/create-three-app/feat/webpack/";

module.exports.domain = domain;

//
// Get Config
//

async function getBasicConfig() {
  if (cache.has(consts.pathTypes.BASIC))
    return cache.get(consts.pathTypes.BASIC);
  const res = await fetch(domain + "examples/config.json", {}).then((res) =>
    res.json()
  );
  cache.set(consts.pathTypes.BASIC, res);
  return res;
}
module.exports.getBasicConfig = getBasicConfig;

//
// Get examples Config
//

async function getExamplesConfig() {
  if (cache.has(consts.pathTypes.EXAMPLE))
    return cache.get(consts.pathTypes.EXAMPLE);
  const res = await fetch(
    `${domain}example-processor/templates/config.json`,
    {}
  ).then((res) => res.json());

  cache.set(consts.pathTypes.EXAMPLE, res);
  return res;
}

module.exports.getExamplesConfig = getExamplesConfig;

//
// Get bundler Config
//

async function getBundlersConfig() {
  if (cache.has(consts.pathTypes.UTILS))
    return cache.get(consts.pathTypes.UTILS);
  const res = await fetch(`${domain}utils/config.json`, {}).then((res) =>
    res.json()
  );
  cache.set(consts.pathTypes.UTILS, res);
  return res;
}

module.exports.getBundlersConfig = getBundlersConfig;

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
// Resolve and check args
//

module.exports.resolveArgs = async function resolveArgs() {
  const args =
    yargs(hideBin(process.argv)).argv ||
    (await yargs(hideBin(process.argv)).argv);

  const _example = args.example || args.e;
  const _bundler = args.bundler || args.b || "webpack";

  const bundlers = Object.keys(await getBundlersConfig());

  if ((!bundlers.includes(_bundler) || _bundler === "common") && _bundler)
    error(
      `Provided bundler (${chalk.yellowBright(
        _bundler
      )}) could not be found in the available bundlers: \n${chalk.greenBright(
        bundlers.join("\n")
      )}\nRun with ${chalk.red("--help")} flag, to see available commands.`
    );

  const configs = {
    dir: args._[0] || "my-three-app",
    isExample: _example,
    template: args.template || args.t,
    bundler: _bundler,
    force: args.force || args.f,
    useNpm: args.preferNpm,
  };

  return configs;
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
      : "utils";
  };
  return `${domain}${path()}${example}/${url ? url + "/" : ""}${file}`;
};

//
// Check whether a directory is empty
//

module.exports.dirIsEmpty = (dir) => fs.readdirSync(dir).length === 0;
