const path = require("path");
const fs = require("fs");
const { format } = require("glslx");

function getAdditions(imports) {
  return imports
    .map((shader) => `import ${shader}_ from './shaders/${shader}.glsl'\n`)
    .toString()
    .replace(/,/g, "");
}

module.exports = function parseShader(window, name) {
  const shaders = Array.from(window.document.querySelectorAll("script")).filter(
    (s) => /(x-)?shader\/(x-*)?/i.test(s.type)
  );

  if (!shaders.length) return {};

  fs.mkdirSync(path.resolve(__dirname, `./templates/${name}/src/shaders`));

  shaders.forEach((shader) => {
    fs.writeFileSync(
      path.resolve(
        __dirname,
        `./templates/${name}/src/shaders/${shader.id.replace(/-(\w)/g, (_, p) =>
          p.toUpperCase()
        )}.glsl`
      ),
      format(shader.innerHTML)
    );
  });

  return {
    additions: getAdditions(
      shaders.map(({ id }) => id.replace(/-(\w)/g, (_, p) => p.toUpperCase()))
    ),
    replace: {
      regex1: new RegExp(
        `\\s*document\\s*\\.getElementById\\(\\s*["'](${shaders
          .map((s) => `${s.id}`)
          .join("|")})["']\\s*\\)\\s*\\.textContent\\s*`,
        "ig"
      ),
      regex2: new RegExp(
        `\\s*document\\.querySelector\\(\\s*["']\\#(${shaders
          .map((s) => `${s.id}`)
          .join("|")})["']\\s*\\)\\s*\\.textContent\\s*(\\.trim\\(\\))?`,
        "ig"
      ),
      resolveVar: (_, p1) => {
        return `${p1.replace(/-(\w)/g, (_, p) => p.toUpperCase())}_`;
      },
    },
  };
};
