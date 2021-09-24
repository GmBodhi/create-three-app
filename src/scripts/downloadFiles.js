import { mkdtempSync, mkdirSync } from "fs";
import { download } from "./utils";
import { Config } from "../types";

function resolveUrl(domain: string, { url, example }: { url: string; example: string; }, file: string, isExample: boolean) {
  return `${domain}${
    isExample ? "example-processor/templates/" : "examples/"
  }${example}/${url ? url + "/" : ""}${file}`;
}

export default async function downloadFiles(example: string, config: Config, domain: string, isExample = false) {
  console.log(`Downloading ${example}`);
  
  const dir = mkdtempSync("create-three-app-cache-");
  
  config.dirs.forEach((directory) => {
    mkdirSync(`${dir}/${directory}`);
  });
  
  for (const [file, url] of Object.entries(config.files)) {
    const filename = `${dir}/${url}/${file}`;
    const resolvedUrl = resolveUrl(domain, { url, example }, file, isExample);
    await download(resolvedUrl, filename);
  }
  
  return dir;
};
