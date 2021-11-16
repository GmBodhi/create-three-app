import fs from "fs";
import path from "path";

// DON'T EDIT OR DELETE THIS FILE. //
let config = {};
function manageDir(directory, json, target = "") {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((file) => {
    if (file.isDirectory()) {
      manageDir(
        path.join(directory, file.name),
        json,
        target + "/" + file.name
      );
      if (!json["dirs"].includes(target + "/" + file.name))
        json["dirs"].unshift(target + "/" + file.name);
    } else {
      let dir = path.relative(
        path.join(__dirname, "templates"),
        path.join(directory)
      );
      json["files"][file.name] = dir.split(/\\|\//gi).slice(1).join("/");
    }
  });
}

fs.readdirSync(path.join(__dirname, "templates"), {
  withFileTypes: true,
}).forEach(function (file) {
  if (file.isDirectory()) {
    config[file.name] = { files: {}, dirs: [] };
    return manageDir(
      path.join(__dirname, "templates", file.name),
      config[file.name],
      ""
    );
  }
  return;
});
saveFile(config);
function saveFile(json) {
  let file = Object.fromEntries(
    Object.entries(json).filter((val) => {
      val[1].dirs = val[1].dirs.sort(
        (a, b) => a.split("/").length - b.split("/").length
      );
      return true;
    })
  );
  fs.writeFileSync("./templates/config.json", JSON.stringify(file));
}
// END OF FILE //
