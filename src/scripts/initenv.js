const chalk = require("chalk");
const spawn = require("cross-spawn");
const path = require("path");
const { error } = require("./utils");

async function installDeps(manager, dir, isExample) {
  console.log(
    chalk.dim(chalk.green(`Installing dependencies using ${manager}..!`))
  );
  spawn(manager === "npm" ? "npm" : "yarn", ["install"], {
    stdio: "inherit",
    cwd: path.join(process.cwd(), dir),
  })
    .on("close", () => {
      console.log(chalk.green("Dependencies installed..!"));
      console.log(
        `${chalk.cyanBright(`\n\n    cd `)}${chalk.yellowBright(dir)}\n`,
        chalk.dim(
          `   ${chalk.cyanBright(
            `${manager === "yarn" ? "yarn" : "npm run"} `
          )}${chalk.yellowBright("dev")}\n`
        )
      );
      console.log(
        chalk.dim(
          `\nDon't forget to run ${chalk.green(
            `${manager === "yarn" ? "yarn" : "npm run"} build`
          )} for production\n`
        )
      );
      if (isExample)
        console.log(
          chalk.yellowBright(
            "You can find some info about assets in assets.json"
          )
        );
    })
    .on("error", (e) => {
      error(e.message);
    });
}

/**
 * @param {string} dir
 */

const init = (manager, dir, isExample = false) => {
  return new Promise((resolve, reject) => {
    spawn("npm", ["init", "-y"], {
      cwd: path.join(process.cwd(), dir),
    })
      .on("exit", () => {
        installDeps(manager, dir, isExample).then(() => resolve);
      })
      .on("error", (e) => {
        reject(e);
        error(e);
      });
  });
};

module.exports = init;
