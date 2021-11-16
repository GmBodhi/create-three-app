import fetch  from "node-fetch";
import {_fetch, close, launch}  from "./fetch";
import rimraf  from "rimraf";
import { mkdirSync, writeFileSync, existsSync } from "fs";
const { init: initServer } = require("./initServer");

function writeAssets(json) {
  Object.entries(json).forEach(([key, value]) => {
    writeFileSync(`./templates/${key}/assets.json`, JSON.stringify(value));
  });
}
initServer().then(({ port }) => {
  const init = () => {
    mkdirSync("./templates");
    fetch(`http://localhost:${port}/examples/files.json`, null)
      .then((r) => r.json())
      .then(async (json) => {
        let targets = [];
        Object.values(json).forEach((r) => targets.push(...r));
        let urls = {};
        await launch({ urls, json: targets, port });
        for (let key of targets) {
          await _fetch(
            `http://localhost:${port}/examples/${key}.html`,
            key
          );
        }
        writeFileSync("./templates/assets.json", JSON.stringify(urls));
        writeAssets(urls);
        await close();
        process.exit(0);
      });
  };

  if (existsSync("./templates")) {
    rimraf("./templates", init);
  } else init();
});
