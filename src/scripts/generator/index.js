const chalk = require("chalk")
const fetch1 = require("./fetch");
const { writeFileSync } = require("fs");
const path = require("path");

function writeAssets(json) {
  Object.entries(json).forEach(([key, value]) => {
    writeFileSync(`./templates/${key}/assets.json`, JSON.stringify(value));
  });
}

module.exports.init = async (dir, example) => {
  console.log(
    chalk.greenBright(
      `Generating package from https://threejs.org/examples/${example}.html`
    )
  );

  let urls = {};

  await fetch1.launch({ urls });

  await fetch1.fetch(`https://threejs.org/examples/${example}.html`, dir);

  await fetch1.close();

  writeFileSync(path.resolve(dir, "/assets.json"), JSON.stringify(urls));

  writeAssets(urls);
};
