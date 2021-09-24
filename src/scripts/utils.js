import chalk from "chalk";
import fetch from "node-fetch";
import fs from "fs";
import spawn from "cross-spawn";

// Error utils
export function error(message: string) {
  console.error(chalk.red(message));
  process.exit(1);
}

// Download utils
export async function download(url: string, dest: string) {
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

export const domain = "https://raw.githubusercontent.com/GmBodhi/create-three-app/master/";

// Get Config
export async function getConfig(domain: string) {
  return await fetch(domain + "examples/config.json").then((res) => res.json());
}

export async function getExamplesConfig(domain: string) {
  return await fetch(domain + "example-processor/templates/config.json").then(
    (res) => res.json()
  );
}

export function checkYarn() {
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
