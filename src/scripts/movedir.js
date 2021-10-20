const { readdirSync, mkdirSync, copyFileSync } = require("fs");
const { error } = require("./utils");
const path = require("path");
const rimraf = require("rimraf");

function manageDir([targetDirectory, dir], target = "") {
  readdirSync(targetDirectory, { withFileTypes: true }).forEach((file) => {
    if (file.isDirectory()) {
      mkdirSync(path.join(process.cwd(), dir, target + "/" + file.name));
      manageDir(
        [path.join(targetDirectory, file.name), dir],
        target + "/" + file.name
      );
    } else {
      copyFileSync(
        path.join(targetDirectory, file.name),
        path.join(process.cwd(), dir, target, file.name)
      );
    }
  });
  rimraf(targetDirectory, (err) => {
    if (err) {
      error(err.message);
    }
  });
}

module.exports = manageDir;
