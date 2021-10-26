const chalk = require("chalk");
const fetch = require("node-fetch");
const fs = require("fs");
const spawn = require("cross-spawn");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const { help, version } = require("./help");
const consts = require("./constants");

//
// Cache
//

const cache = new Map();

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

async function download(url, dest, kill = false) {
  const res = await fetch(url);
  if (!res.ok) {
    console.log(url);
    console.log(
      chalk.redBright(`Server responded with ${res.status}: ${res.statusText}`)
    );
    if (kill)
      return error(`Server responded with ${res.status}: ${res.statusText}`);
    console.log(chalk.blueBright("\nRetrying..!\r"));
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
// Resolve and check args
//

module.exports.resolveArgs = async function resolveArgs() {
  const args = yargs(hideBin(process.argv)).help(false).argv; //||
  // (await yargs(hideBin(process.argv)).version(false).help(false).argv);

  if (args.help || args.h) help();
  else if (args.v) version();

  const _example = args.example || args.e;
  const _bundler = args.bundler || args.b || "webpack";

  const bundlers = Object.keys((await getConfig()).utils);

  if ((!bundlers.includes(_bundler) || _bundler === "common") && _bundler)
    error(
      `Provided bundler (${chalk.yellowBright(
        _bundler
      )}) could not be found in the available bundlers: \n${chalk.greenBright(
        bundlers.filter((b) => b !== "common").join("\n")
      )}\nRun with ${chalk.red("--help")} flag, to see available commands.`
    );

  const configs = {
    dir: args._[0] || "my-three-app",
    isExample: !!_example,
    example: _example,
    bundler: _bundler,
    force: args.force || args.f,
    useNpm: args.preferNpm,
    interactive: args.interactive || args.i,
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
