#!/usr/bin/env node

// DO NOT EDIT OR DELETE THIS FILE.

"use strict";
const { mkdirSync, existsSync } = require("fs");
const chalk = require("chalk");
const {
  domain,
  getConfig,
  getExamplesConfig,
  checkYarn,
} = require("./scripts/utils");
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

getConfig(domain)
  .then((config) => {
    let examples = Object.keys(config);
    examples.push("I'll select from threejs examples");
    new AutoComplete({
      name: "Example",
      message: "Which example do you want to use?",
      choices: examples,
    })
      .run()
      .then((example) => {
        if (example === "I'll select from threejs examples") {
          getExamplesConfig(domain).then((config) => {
            new AutoComplete({
              name: "Example",
              message: "Which example do you want to use?",
              choices: Object.keys(config),
            })
              .run()
              .then((res) => {
                console.log(
                  chalk.yellowBright("Note: "),
                  "Using an example from three.js may cause unresolved resource urls, which you may have to resolve..."
                );
                mkdirSync(dir);
                checkYarn().then((r) => init(r, true));

                downloadfiles(res, config[res], domain, true).then(
                  (directory) => {
                    manageDir(directory);
                  }
                );
              })
              .catch((e) => console.error(chalk.red("Process aborted"), e));
          });
        } else {
          mkdirSync(dir);
          checkYarn().then((r) => init(r));
          downloadfiles(example, config[example], domain).then((directory) => {
            manageDir(directory);
          });
        }
      })
      .catch((e) => console.log(chalk.red("Process aborted"), e));
  })
  .catch((e) =>
    console.log(
      chalk.red("An error occurred while fetching the config file"),
      e
    )
  );
