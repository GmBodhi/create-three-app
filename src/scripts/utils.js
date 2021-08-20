const chalk = require("chalk");
const fetch = require("node-fetch");
const fs = require("fs");

// Error utils
function error(message) {
  console.error(chalk.red(message));
  process.exit(1);
}
module.exports.error = error;

// Download utils
async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok)
    return error(`Srver responded with ${res.status}: ${res.statusText}`);
  const fileStream = fs.createWriteStream(dest);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
}
module.exports.download = download;

module.exports.domain =
  "https://raw.githubusercontent.com/GmBodhi/create-three-app/master/";

// Get Config
async function getConfig(domain) {
  return await fetch(domain + "examples/config.json").then((res) => res.json());
}
module.exports.getConfig = getConfig;

async function getExamplesConfig(domain) {
  return await fetch(domain + "example-processor/config.json").then((res) =>
    res.json()
  );
}
