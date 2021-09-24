import fs from "fs";
import path from "path";

// DON'T EDIT OR DELETE THIS FILE. //
const config: {
  [dir: string]: { files: { [file: string]: string; };; dirs: string[]; };
} = {};

// ! Consider using `path.join` to join file paths so it is cross-platform...

function manageDir(directory: string, json: { dirs: string[]; files: { [file: string]: string; }; }, target = "") {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((file) => {
    if (file.isDirectory()) {
      manageDir(
        path.join(directory, file.name),
        json,
        target + "/" + file.name,
      );

      if (!json["dirs"].includes(target + "/" + file.name))
        json["dirs"].unshift(target + "/" + file.name);
    } else {
      const dir = path.relative(
        path.join(__dirname, "examples"),
        path.join(directory),
      );
      
      json["files"][file.name] = dir.split("\\").slice(1).join("/"); // why split by backslash?
    }
  });
}

fs.readdirSync(path.join(__dirname, "examples"), {
  withFileTypes: true,
}).forEach((file) => {
  if (file.isDirectory()) {
    config[file.name] = { files: {}, dirs: [] };
    
    return manageDir(
      path.join(__dirname, "examples", file.name),
      config[file.name],
      "",
    );
  }
  return;
});

saveFile(config);

function saveFile(json) {
  const file = Object.fromEntries(
    Object.entries(json).map((val) => {
      val[1].dirs = val[1].dirs.sort(
        (a, b) => a.split("/").length - b.split("/").length
      );
      
      return val;
    });
  );
  
  fs.writeFileSync("./examples/config.json", JSON.stringify(file));
}
// END OF FILE //
