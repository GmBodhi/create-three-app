#!/usr/bin/env node

// DO NOT EDIT OR DELETE THIS FILE.

"use strict";
console.log(process);
console.log(process.argv);
const { mkdirSync, existsSync } = require("fs");
const chalk = require("chalk");
const { domains, getConfig } = require("./scripts/utils");
// @ts-ignore
const { Select, AutoComplete } = require("enquirer");
const init = require("./scripts/initenv");
const manageDir = require("./scripts/movedir");
const downloadfiles = require("./scripts/downloadfiles");

const dir = process.argv[2] || "my-three-app";

if (existsSync(dir)) {
  console.error(
    `${chalk.red(
      `This directroy already exists, please provide a non-existing directory name.`
    )} ${chalk.yellowBright(`create-three-app`)} ${chalk.green("{")}${chalk.dim(
      `directroy`
    )}${chalk.green("}")}`
  );
  process.exit(1);
}

new Select({
  name: "Domain",
  message: "Which domain should we use to fetch the files?",
  choices: Object.keys(domains),
})
  .run()
  .then(async (domain) => {
    const config = await getConfig(domain);
    new AutoComplete({
      name: "Example",
      message: "Which example do you want to use?",
      choices: Object.keys(config),
    })
      .run()
      .then((example) => {
        new Select({
          name: "deps",
          message: "How do you want to instal dependecies?",
          choices: ["yarn", "npm"],
        })
          .run()
          .then((pkgManager) => {
            mkdirSync(dir);
            downloadfiles(example, config[example], domain).then(
              (directory) => {
                manageDir(directory);
                init(pkgManager);
              }
            );
          })
          .catch((e) => console.log(chalk.red("Process aborted"), e));
      })
      .catch((e) => console.log(chalk.red("Process aborted"), e));
  })
  .catch((e) => console.log(chalk.red("Process aborted"), e));
