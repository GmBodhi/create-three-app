const { JSDOM } = require("jsdom");

module.exports = function parseScript(window) {
  let { document } = window;
  Array.from(document.querySelectorAll("style")).forEach((s) => s.remove());
  Array.from(document.querySelectorAll("script"))
    .filter((s) => s.type == "module")
    .forEach((s) => {
      s.remove();
    });
  document.body.style.overflow = "hidden";
  return `<html>${document.documentElement.innerHTML}</html>`.replace(
    /(\<\link\s+type\s*\=\"text\/css\"\s*rel\s*\=\s*\"stylesheet\"\s*href\s*=\s*\"main\.css\"\>)/gi,
    ""
  );
};
