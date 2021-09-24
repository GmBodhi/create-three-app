import { readdirSync, mkdirSync, copyFileSync } from "fs";
import { error } from "./utils";
import path from "path";
import rimraf from "rimraf";

const dir = process.argv[2] ?? "my-three-app";

function manageDir(directory: string, target = "") {
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

export default manageDir;
