const chalk = require("chalk");
const fetch = require("node-fetch");
const fs = require("fs");

// Error utils
module.exports.error = function error(message) {
  console.error(chalk.red(message));
  process.exit(1);
};

// Download utils
module.exports.download = async function download(url, dest) {
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(dest);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
};

// CDN domains
let domains = {
  "cdn.statically.io":
    "https://cdn.statically.io/gh/GmBodhi/create-three-app/master/",
  "raw.githubusercontent.com":
    "https://raw.githubusercontent.com/GmBodhi/create-three-app/master/",
  "cdn.jsdelivr.net":
    "https://cdn.jsdelivr.net/gh/gmbodhi/create-three-app@master/",
};
module.exports.domains = domains;

// Get Config
module.exports.getConfig = async function getConfig(domain) {
  return await fetch(domains[domain] + "examples/config.json").then((res) =>
    res.json()
  );
};
