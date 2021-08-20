const { JSDOM } = require("jsdom");

module.exports = function parseScript(html) {
  let style = "";
  let { window } = new JSDOM(html);
  let { document } = window;
  Array.from(document.querySelectorAll("style")).forEach((s) => {
    style += s.innerHTML;
  });
  return style;
};
