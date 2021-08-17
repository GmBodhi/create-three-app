#!/usr/bin/env node

"use strict";
const { mkdirSync, existsSync } = require("fs");
const chalk = require("chalk");
const path = require("path");
// @ts-ignore
const { Select, AutoComplete } = require("enquirer");
const init = require("./scripts/initEnv");
const manageDir = require("./scripts/movedir");

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
  name: "deps",
  message: "How do you want to instal dependecies?",
  choices: ["yarn", "npm"],
})
  .run()
  .then((ans) => {
    new AutoComplete({
      name: "Example",
      message: "Which example do you want to use?",
      choices: ["Basic", "Basic (with orbitcontrols)"],
    })
      .run()
      .then((answer) => {
        mkdirSync(dir);
        manageDir(path.join(__dirname, "../examples", answer));
        init(ans);
      })
      .catch((e) => console.log(chalk.red("Process aborted"), e));
  })
  .catch((e) => console.log(chalk.red("Process aborted"), e));
