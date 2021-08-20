const { JSDOM } = require("jsdom");

function resolveUrl(match, url) {
  if (url === "./build/three.module.js") return "three";
  return `three/examples${url}`;
}

module.exports = function parseScript(html) {
  let js = 'import "./style.css"; // For webpack support\n';
  let { window } = new JSDOM(html);
  let { document } = window;
  Array.from(document.querySelectorAll("script"))
    .filter((s) => s.type == "module")
    .forEach((s) => {
      js += s.innerHTML.replace(
        /\.(\.\/build\/three\.module\.js|\/)/gi,
        resolveUrl
      );
    });
  return js;
};
