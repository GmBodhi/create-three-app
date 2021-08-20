const fetch = require("node-fetch");
const fetch1 = require("./fetch");
const rimraf = require("rimraf");
const { mkdirSync, writeFileSync, existsSync } = require("fs");

const init = () => {
  mkdirSync("./templates");
  fetch("https://threejs.org/examples/tags.json")
    .then((r) => r.json())
    .then(async (json) => {
      let urls = {};
      await fetch1.launch({ urls, json: Object.keys(json) });
      for (let key of Object.keys(json)) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await fetch1.fetch(`https://threejs.org/examples/${key}.html`, key);
      }
      writeFileSync("assets.json", JSON.stringify(urls));
      await fetch1.close();
    });
};

if (existsSync("./templates")) {
  rimraf("./templates", init);
} else init();
