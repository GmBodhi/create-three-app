#!/usr/bin/env node

// DO NOT EDIT OR DELETE THIS FILE.

import { mkdirSync, existsSync } from "fs";
import chalk from "chalk";
import { domain, getConfig, getExamplesConfig, checkYarn } from "./scripts/utils";
import { AutoComplete } from "enquirer";
import init from "./scripts/initEnv";
import manageDir from "./scripts/moveDir";
import downloadFiles from "./scripts/downloadFiles";

const dir = process.argv[2] ?? "my-three-app";

getConfig(domain)
  .then((config) => {
    const threeExamples = Object.keys(config);
    const examples = [...threeExamples, "Select from threejs examples"];

    new AutoComplete({
      name: "Example",
      message: "Which example do you want to use?",
      choices: examples,
    })
      .run()
      .then((example) => {
        if (threeExamples.includes(example)) {
          if (!existsSync(dir)) {
            mkdirSync(dir);
          }
          checkYarn().then(init);
          downloadFiles(example, config[example], domain).then(manageDir);
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
                if (!existsSync(dir)) {
                  mkdirSync(dir);
                }
                checkYarn().then((answer) => init(answer, true));
                downloadFiles(res, config[res], domain, true).then(manageDir);
              })
              .catch((e) => console.error(chalk.red("Process aborted"), e));
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
