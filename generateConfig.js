const fs = require("fs");
const path = require("path");

// DON'T EDIT OR DELETE THIS FILE. //
let config = {};
function manageDir(directory, json, target = "", exclusions = []) {
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
      if (exclusions.includes(file.name)) return;
      let dir = path.relative(
        path.join(__dirname, "examples"),
        path.join(directory)
      );
      json["files"][file.name] = dir.split("\\").slice(1).join("/");
    }
  });
}

fs.readdirSync(path.join(__dirname, "examples"), {
  withFileTypes: true,
}).forEach(function (file) {
  if (file.isDirectory()) {
    config[file.name] = { files: {}, dirs: [] };
    return manageDir(
      path.join(__dirname, "examples", file.name),
      config[file.name],
      ""
    );
  }
  return;
});

const utils = { utils: { files: {}, dirs: [] } };
manageDir(path.join(__dirname, "utils"), utils["utils"], undefined, [
  "config.json",
]);
saveFile(utils, "./utils/config.json");

saveFile(config);

function saveFile(json, target = "./examples/config.json") {
  let file = Object.fromEntries(
    Object.entries(json).filter((val) => {
      val[1].dirs = val[1].dirs.sort(
        (a, b) => a.split("/").length - b.split("/").length
      );
      return true;
    })
  );
  fs.writeFileSync(target, JSON.stringify(file));
}
// END OF FILE //
