const fetch = require("node-fetch");
const fetch1 = require("./fetch");
const rimraf = require("rimraf");
const { mkdirSync, writeFileSync, existsSync } = require("fs");

function writeAssets(json) {
  Object.entries(json).forEach(([key, value]) => {
    writeFileSync(`./templates/${key}/assets.json`, JSON.stringify(value));
  });
}

const init = () => {
  mkdirSync("./templates");
  fetch("https://threejs.org/examples/files.json")
    .then((r) => r.json())
    .then(async (json) => {
      let targets = [];
      Object.values(json).forEach((r) => targets.push(...r));
      let urls = {};
      await fetch1.launch({ urls, json: targets });
      for (let key of targets) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await fetch1.fetch(`https://threejs.org/examples/${key}.html`, key);
      }
      writeFileSync("./templates/asstes.json", JSON.stringify(urls));
      writeAssets(urls);
      await fetch1.close();
    });
};

if (existsSync("./templates")) {
  rimraf("./templates", init);
} else init();
