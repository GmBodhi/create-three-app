const { readdirSync, mkdirSync, copyFileSync } = require("fs");
const path = require("path");

function manageDir(targetDirectory, dir, target = "") {
  readdirSync(targetDirectory, { withFileTypes: true }).forEach((file) => {
    if (file.isDirectory()) {
      mkdirSync(path.join(process.cwd(), dir, target + "/" + file.name));
      manageDir(
        path.join(targetDirectory, file.name),
        dir,
        target + "/" + file.name
      );
    } else {
      copyFileSync(
        path.join(targetDirectory, file.name),
        path.join(process.cwd(), dir, target, file.name)
      );
    }
  });
}

module.exports = manageDir;
