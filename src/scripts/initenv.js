const { dim, green, cyanBright, yellowBright } = require("ansi-colors");
const spawn = require("cross-spawn");
const path = require("path");
const { error } = require("./utils");

async function installDeps(manager, dir, isExample) {
  console.log(
    dim(green(`Installing dependencies using ${manager}..!`))
  );
  spawn(manager === "npm" ? "npm" : "yarn", ["install"], {
    stdio: "inherit",
    cwd: path.join(process.cwd(), dir),
  })
    .on("close", () => {
      console.log(green("Dependencies installed..!"));
      console.log(
        `${cyanBright(`\n\n    cd `)}${yellowBright(dir)}\n`,
        dim(
          `   ${cyanBright(
            `${manager === "yarn" ? "yarn" : "npm run"} `
          )}${yellowBright("dev")}\n`
        )
      );
      console.log(
        dim(
          `\nDon't forget to run ${green(
            `${manager === "yarn" ? "yarn" : "npm run"} build`
          )} for production\n`
        )
      );
      if (isExample)
        console.log(
          yellowBright(
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
