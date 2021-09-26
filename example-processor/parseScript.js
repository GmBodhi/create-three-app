const { JSDOM } = require("jsdom");

function resolveUrl(match, url) {
  if (url === "./build/three.module.js") return "three";
  return `three/examples${url}`;
}

let imports = [];

function treeShaking(match, p1) {
  imports.push(p1);
  return p1;
}

function subimports() {
  return `import { ${imports.toString()} } from "three"`;
}

module.exports = function parseScript(html) {
  let js = 'import "./style.css"; // For webpack support\n';
  let { window } = new JSDOM(html);
  let { document } = window;
  Array.from(document.querySelectorAll("script"))
    .filter((s) => s.type == "module")
    .forEach((s) => {
      js += s.innerHTML
        .replace(/\.(\.\/build\/three\.module\.js|\/)/gi, resolveUrl)
        .replace(/THREE\.(\w+)/g, treeShaking)
        .replace(
          /import\s*\*\s*as\s+THREE\s+from\s*(\"|\')three(\"|\')/g,
          subimports
        );
    });
  return js;
};
