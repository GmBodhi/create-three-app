const path = require("path");
const fs = require("fs");

function getAdditions(imports) {
  return imports
    .map((shader) => `import ${shader} from './shaders/${shader}.glsl'\n`)
    .toString();
}

module.exports = function parseShader(window, name) {
  const shaders = Array.from(window.document.querySelectorAll("script")).filter(
    (s) => /(x\-)?shader\/(x\-*)?/i.test(s.type)
  );

  if (!shaders.length) return {};

  fs.mkdirSync(path.resolve(__dirname, `./templates/${name}/src/shaders`));

  shaders.forEach((shader) => {
    fs.writeFileSync(
      path.resolve(
        __dirname,
        `./templates/${name}/src/shaders/${shader.id}.glsl`
      ),
      JSON.stringify(shader.textContent)
    );
  });

  return {
    additions: getAdditions(shaders.map(({ id }) => id)),
    replace: {
      regex: new RegExp(
        `\s*document\.getElementById\(\s*["'](${shaders
          .map((s) => `${s.id}|`)
          .toString()
          .replace(/,/g, "")
          .slice(0, -1)})["']\s*\)\.textContent\s*`,
        "ig"
      ),
      func: "$1",
    },
  };
};
