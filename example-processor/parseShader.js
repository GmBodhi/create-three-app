const path = require("path");
const fs = require("fs");

module.exports = function parseShader(window, name) {
  const shaders = Array.from(window.document.querySelectorAll("script")).filter(
    (s) => /(x\-)?shader\/(x\-*)?/i.test(s.type)
  );

  if (!shaders.length) return;

  fs.mkdirSync(path.resolve(__dirname, `./templates/${name}/src/shaders`));

  shaders.forEach((shader) => {
    fs.writeFileSync(
      path.resolve(__dirname, `./templates/${name}/src/shaders/${shader.id}.glsl`),
      JSON.stringify(shader.textContent)
    );
  });
};
