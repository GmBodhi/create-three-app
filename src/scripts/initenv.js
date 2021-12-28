import ansiColors from "ansi-colors";
import spawn from "cross-spawn";
import path from "path";
import { error } from "./utils.js";

async function installDeps(manager, dir, isExample) {
  console.log(
    ansiColors.dim(
      ansiColors.green(`Installing dependencies using ${manager}..!`)
    )
  );
  spawn(manager === "npm" ? "npm" : "yarn", ["install"], {
    stdio: "inherit",
    cwd: path.join(process.cwd(), dir),
  })
    .on("close", () => {
      console.log(ansiColors.green("Dependencies installed..!"));
      console.log(
        `${ansiColors.cyanBright(`\n\n    cd `)}${ansiColors.yellowBright(
          dir
        )}\n`,
        ansiColors.dim(
          `   ${ansiColors.cyanBright(
            `${manager === "yarn" ? "yarn" : "npm run"} `
          )}${ansiColors.yellowBright("dev")}\n`
        )
      );
      console.log(
        ansiColors.dim(
          `\nDon't forget to run ${ansiColors.green(
            `${manager === "yarn" ? "yarn" : "npm run"} build`
          )} for production\n`
        )
      );
      if (isExample)
        console.log(
          ansiColors.yellowBright(
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

export default init;
