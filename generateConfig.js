const fs = require("fs");
const path = require("path");

// DON'T EDIT OR DELETE THIS FILE. //

let config = {
  examples: {},
  basic: {},
  utils: {},
};

function manageDir(directory, json, target = "", relative) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((file) => {
    if (file.isDirectory()) {
      manageDir(
        path.join(directory, file.name),
        json,
        target + "/" + file.name,
        relative
      );
      if (!json["dirs"].includes(target + "/" + file.name))
        json["dirs"].unshift(target + "/" + file.name);
    } else {
      let dir = path.relative(
        path.join(__dirname, relative),
        path.join(directory)
      );
      json["files"][file.name] = dir.split(/\\|\//g).slice(1).join("/");
    }
  });
}

function format({ file }) {
  return Object.fromEntries(
    Object.entries(file).filter((val) => {
      val[1].dirs = val[1].dirs.sort(
        (a, b) => a.split("/").length - b.split("/").length
      );
      return true;
    })
  );
}

function saveFile(json, dir) {
  const output = {};
  Object.entries(json).forEach(([k, v]) => {
    output[k] = format({ file: v });
  });
  fs.writeFileSync(`${dir}/config.json`, JSON.stringify(output, null, 2));
}

function init(d, config) {
  fs.readdirSync(path.join(__dirname, d), {
    withFileTypes: true,
  }).forEach(function (file) {
    if (file.isDirectory()) {
      config[file.name] = { files: {}, dirs: [] };
      return manageDir(
        path.join(__dirname, d, file.name),
        config[file.name],
        "",
        d
      );
    }
    return;
  });
}

init("./examples", config.basic);
init("./example-processor/templates", config.examples);
init("./utils", config.utils);

saveFile(config, process.cwd());
// END OF FILE //
