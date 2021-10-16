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
const { AutoComplete } = require("enquirer");
const init = require("./scripts/initenv");
const manageDir = require("./scripts/movedir");
const downloadFiles = require("./scripts/downloadfiles");

const dir = process.argv[2] || "my-three-app";

(async () => {
  const config = await getConfig(domain).catch((e) =>
    console.log(
      chalk.red("An error occurred while fetching the config file"),
      e
    )
  );

  const threeExamples = Object.keys(config);
  const examples = [...threeExamples, "Select from threejs examples"];

  const example = await new AutoComplete({
    name: "Example",
    message: "Which example do you want to use?",
    choices: examples,
  })
    .run()
    .catch((e) => console.log(chalk.red("Process aborted"), e));

  if (threeExamples.includes(example)) {
    if (!existsSync(dir)) mkdirSync(dir);

    checkYarn().then(init);

    downloadFiles(example, config[example], domain).then(manageDir);
  } else {
    const config = await getExamplesConfig(domain);

    const res = await new AutoComplete({
      name: "Example",
      message: "Select example",
      choices: Object.keys(config),
    })
      .run()
      .catch((e) => console.error(chalk.red("Process aborted"), e));

    console.log(
      chalk.yellowBright("Note: "),
      "Using an example from three.js may cause unresolved resource urls, which you may have to resolve..."
    );
    if (!existsSync(dir)) {
      mkdirSync(dir);
    }
    checkYarn().then((answer) => init(answer, true));
    downloadFiles(res, config[res], domain, true).then(manageDir);
  }
})();
