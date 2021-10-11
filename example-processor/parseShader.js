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
      regex:
        /document\n*\.(querySelector|getElementById)\(\s*['"]#?([^'"]+)['"]\s*\)\n*\.textContent[^,;}]*/gi,
      resolveVar: (_, _p, p2) => {
        console.log(
          _,
          " -> ",
          `${p2.replace(/-(\w)/g, (_, p) => p.toUpperCase())}_`
        );
        return `${p2.replace(/-(\w)/g, (_, p) => p.toUpperCase())}_`;
      },
    },
  };
};
