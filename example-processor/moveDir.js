import { readdirSync, mkdirSync, copyFileSync } from "fs";
import path from "path";

function manageDir(directory, dir, target = "") {
  readdirSync(directory, { withFileTypes: true }).forEach((file) => {
    if (file.isDirectory()) {
      mkdirSync(path.join(process.cwd(), dir, target + "/" + file.name));
      manageDir(path.join(directory, file.name), dir, target + "/" + file.name);
    } else {
      copyFileSync(
        path.join(directory, file.name),
        path.join(process.cwd(), dir, target, file.name)
      );
    }
  });
}

export default manageDir;
