const { mkdtempSync, mkdirSync } = require("fs");
const { download, domains } = require("./utils");

function resolveUrl(domain, { url, example }, file) {
  return `${domains[domain]}examples/${example}/${url ? url + "/" : ""}${file}`;
}

module.exports = async function (example, config, domain) {
  console.log(`Downloading ${example}`);
  let dir = mkdtempSync("create-three-app-cache-");
  config.dirs.forEach((directory) => {
    mkdirSync(`${dir}/${directory}`);
  });
  for (let [file, url] of Object.entries(config.files)) {
    let filename = `${dir}/${url}/${file}`;
    let resolvedUrl = resolveUrl(domain, { url, example }, file);
    await download(resolvedUrl, filename);
  }
  return dir;
};
