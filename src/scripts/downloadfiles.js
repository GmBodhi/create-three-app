import { mkdirSync } from "fs";
import { download, resolveUrl } from "./utils.js";

export default async function (example, config, dir, domain, type) {
  //
  config.dirs.forEach((directory) => mkdirSync(`${dir}/${directory}`));

  for (let [file, url] of Object.entries(config.files)) {
    //
    let filename = `${dir}/${url}/${file}`;

    let resolvedUrl = resolveUrl(domain, { url, example }, file, type);

    await download(resolvedUrl, filename);
  }

  return;
}
