const { mkdirSync } = require("fs");
const { download, resolveUrl } = require("./utils");

module.exports = async function (
  example,
  config,
  dir,
  targetDir,
  domain,
  type
) {
  //
  config.dirs.forEach((directory) => mkdirSync(`${dir}/${directory}`));

  for (let [file, url] of Object.entries(config.files)) {
    //
    let filename = `${dir}/${url}/${file}`;

    let resolvedUrl = resolveUrl(domain, { url, example }, file, type);

    await download(resolvedUrl, filename);
  }

  return [dir, targetDir];
};
