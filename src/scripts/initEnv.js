const chalk = require("chalk");
const spawn = require("cross-spawn");
const path = require("path");
const manageError = require("./manageError");

let dir = process.argv[2] || "my-three-app";

async function installDeps(manager) {
  console.log(
    chalk.dim(chalk.green(`Installing dependencies using ${manager}..!`))
  );
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
      manageError(e.message);
    });
}

const init = (answer) => {
  spawn("npm", ["init", "-y"], {
    cwd: path.join(process.cwd(), dir),
  })
    .on("exit", () => {
      installDeps(answer);
    })
    .on("error", (e) => {
      manageError(e.message);
    });
};

module.exports = init;
