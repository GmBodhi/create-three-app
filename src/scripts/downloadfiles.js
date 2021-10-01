const { mkdtempSync, mkdirSync } = require("fs");
const { download, domain } = require("./utils");

function resolveUrl({ url, example }, file, isThree) {
  return `${isThree ? "https://threejs.org/examples/" : domain}${
    isThree ? "" : "examples/"
  }${
    isThree ? `${example}.html` : `${example}/${url ? url + "/" : ""}${file}`
  }`;
}

module.exports = async function (example, config, isExample = false) {
  console.log(`Downloading ${example}`);

  let dir = mkdtempSync("create-three-app-cache-");

  config.dirs.forEach((directory) => {
    mkdirSync(`${dir}/${directory}`);
  });

  for (let [file, url] of Object.entries(config.files)) {
    let filename = `${dir}/${url}/${file}`;

    let resolvedUrl = resolveUrl({ url, example }, file, isExample);

    await download(resolvedUrl, filename);
  }
  await require("./generator/index").init(dir);
  return dir;
};
