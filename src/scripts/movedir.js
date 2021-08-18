const { readdirSync, mkdirSync, copyFileSync, rmdir } = require("fs");
const { error } = require("./utils");
const path = require("path");
const rimraf = require("rimraf");

const dir = process.argv[2] || "my-three-app";

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
  rimraf(directory, (err) => {
    if (err) {
      error(err.message);
    }
  });
}

module.exports = manageDir;
