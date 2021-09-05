#!/usr/bin/env node

// DO NOT EDIT OR DELETE THIS FILE.

"use strict";
const { mkdirSync } = require("fs");
const chalk = require("chalk");
const {
  domain,
  getConfig,
  getExamplesConfig,
  checkYarn,
} = require("./scripts/utils");
// @ts-ignore
const { AutoComplete } = require("enquirer");
const init = require("./scripts/initenv");
const manageDir = require("./scripts/movedir");
const downloadfiles = require("./scripts/downloadfiles");

const dir = process.argv[2] || "my-three-app";

getConfig(domain)
  .then((config) => {
    const threeExamples = Object.keys(config);
    const examples = [ ...threeExamples, "Select from threejs examples" ];

    new AutoComplete({
      name: "Example",
      message: "Which example do you want to use?",
      choices: examples,
    })
      .run()
      .then((example) => {
        if (threeExamples.includes(example)) {
          mkdirSync(dir);
          checkYarn().then(init);
          downloadfiles(example, config[example], domain).then(manageDir);
        } else {
          getExamplesConfig(domain).then((config) => {
            new AutoComplete({
              name: "Example",
              message: "Select example",
              choices: Object.keys(config),
            })
              .run()
              .then((res) => {
                console.log(
                  chalk.yellowBright("Note: "),
                  "Using an example from three.js may cause unresolved resource urls, which you may have to resolve..."
                );
                mkdirSync(dir);
                checkYarn().then((answer) => init(answer, true));

                downloadfiles(res, config[res], domain, true).then(manageDir);
              })
              .catch((e) => console.error(chalk.red("Process aborted"), e));
          });
        }
      })
      .catch((e) => console.log(chalk.red("Process aborted"), e));
  })
  .catch((e) => console.log(chalk.red("An error occurred while fetching the config file"), e));
