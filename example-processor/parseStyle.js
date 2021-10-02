module.exports = function parseScript(window) {
  let style = "";

  let { document } = window;
  Array.from(document.querySelectorAll("style")).forEach((s) => {
    style += s.innerHTML;
  });
  return style;
};
