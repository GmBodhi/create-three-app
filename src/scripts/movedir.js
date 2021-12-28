import { readdirSync, mkdirSync, copyFileSync } from "fs";
import path from "path";

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

export default manageDir;
