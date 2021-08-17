#!/usr/bin/env node

"use strict";
const { mkdirSync, copyFileSync, readdirSync, existsSync } = require("fs");
const spawn = require("cross-spawn");
const chalk = require("chalk");
const path = require("path");
const { Select, AutoComplete } = require("enquirer");

let dir = process.argv[2] || "my-three-app";

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

function manageDir(directory, target = "") {
  readdirSync(directory, { withFileTypes: true }).forEach((file) => {
    if (file.isDirectory()) {
      mkdirSync(path.join(process.cwd(), dir, target + "/" + file.name));
      manageDir(path.join(directory, file.name), target + "/" + file.name);
    } else {
      copyFileSync(
        path.join(directory, file.name),
        path.join(process.cwd(), dir, target, file.name)
      );
    }
  });
}

async function installDeps(manager) {
  console.log(
    chalk.dim(chalk.green(`Installing dependencies using ${manager}..!`))
  );
  // @ts-ignore
  spawn(manager === "npm" ? "npm" : "yarn", ["install"], {
    stdio: "inherit",
    cwd: path.join(process.cwd(), dir),
  })
    .on("close", () => {
      console.clear();
      console.log(chalk.green("Dependencies installed..!"));
      console.clear();
      console.log(
        `${chalk.cyanBright(`\n\n    cd `)}${chalk.yellowBright(dir)}\n`,
        chalk.dim(
          `   ${chalk.cyanBright(
            `${manager === "yarn" ? "yarn" : "npm run"} `
          )}${chalk.yellowBright("dev")}\n and edit your files\n`
        )
      );
      console.log(
        chalk.dim(
          `\nDon't forget to run ${chalk.green(
            `${manager === "yarn" ? "yarn" : "npm run"} build`
          )} for production\n`
        )
      );
    })
    .on("error", (e) => {
      console.error(chalk.red(e));
    });
}

const init = (answer) => {
  // @ts-ignore
  spawn("npm", ["init", "-y"], {
    cwd: path.join(process.cwd(), dir),
  })
    .on("exit", () => {
      installDeps(answer);
    })
    .on("error", (e) => {
      console.error(chalk.red(e));
    });
};

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
