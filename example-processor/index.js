const fetch = require("node-fetch");
const fetch1 = require("./fetch");
const rimraf = require("rimraf");
const { mkdirSync, writeFileSync, existsSync } = require("fs");
const { init: initServer } = require("./initServer");

function writeAssets(json) {
  Object.entries(json).forEach(([key, value]) => {
    writeFileSync(`./templates/${key}/assets.json`, JSON.stringify(value));
  });
}
initServer().then(({ port }) => {
  const init = () => {
    mkdirSync("./templates");
    fetch(`http://localhost:${port}/examples/files.json`)
      .then((r) => r.json())
      .then(async (json) => {
        let targets = [];
        Object.values(json).forEach((r) => targets.push(...r));
        let urls = {};
        await fetch1.launch();
        for (let key of targets) {
          await fetch1.fetch(
            `http://localhost:${port}/examples/${key}.html`,
            key,
            { urls, port, json }
          );
        }
        writeFileSync("./templates/assets.json", JSON.stringify(urls));
        writeAssets(urls);
        await fetch1.close();
        process.exit(0);
      });
  };

  if (existsSync("./templates")) {
    rimraf("./templates", init);
  } else init();
});
