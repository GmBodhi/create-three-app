const fs = require("fs");
const path = require("path");

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
        path.join(__dirname, "examples"),
        path.join(directory)
      );
      json["files"][file.name] = dir.split("\\").slice(1).join("/");
    }
  });
}

function saveFile(json, dir) {
  let file = Object.fromEntries(
    Object.entries(json).filter((val) => {
      val[1].dirs = val[1].dirs.sort(
        (a, b) => a.split("/").length - b.split("/").length
      );
      return true;
    })
  );
  fs.writeFileSync(`${dir}/config.json`, JSON.stringify(file));
}
["./examples", "utils"].forEach(d => {
  config = {};

  fs.readdirSync(path.join(__dirname, d), {
    withFileTypes: true,
  }).forEach(function (file) {
    if (file.isDirectory()) {
      config[file.name] = { files: {}, dirs: [] };
      return manageDir(
        path.join(__dirname, d, file.name),
      config[file.name],
      ""
      );
    }
    return;
  });
  
saveFile(config, d);
})

// END OF FILE //
