const { writeFileSync, mkdirSync } = require("fs");
const chalk = require("chalk");
const parseScript = require("./parseScript");
const parseShader = require("./parseShader");
const parseStyle = require("./parseStyle");
const parseHtml = require("./parseHtml");
const path = require("path");
const puppeteer = require("puppeteer");
const { JSDOM } = require("jsdom");
const { format } = require("prettier");

let browser, page;

module.exports.launch = async ({ urls }) => {
  browser = await puppeteer.launch({ args: ["--no-sandbox"] });

  page = await browser.newPage();

  page.on("request", (request) => {
    let url =
      request.frame()?.url()?.split("/").at(-1)?.split(".")[0] ?? "unknown";

    let reqUrl = request.url()?.split("/").at(-1) ?? "unknown";

    if (
      [
        "https://threejs.org/build/three.module.js",
        "https://threejs.org/examples/jsm/libs/stats.module.js",
        "https://threejs.org/examples/jsm/libs/dat.gui.module.js",
        "about:blank",
      ].includes(request.url()) ||
      url === "about:blank" ||
      reqUrl.endsWith(".js") ||
      reqUrl.endsWith(".html")
    )
      return;
    if (!urls[url]) urls[url] = [];
    urls[url].push(request.url());
  });
  return;
};

module.exports.close = async () => {
  console.log(chalk.cyan("Closing browser"));

  return await browser.close();
};

module.exports.fetch = async function (url, dir) {
  let p = await page.goto(url, { timeout: 0 });

  let { window } = new JSDOM(await p.text());

  mkdirSync(path.resolve(dir, "/src"));

  let { additions, replace } = parseShader(window, dir);
  let script = parseScript(window, additions, replace);
  let style = parseStyle(window);
  let html = parseHtml(window);

  writeFileSync(path.resolve(dir, `./src/index.html`), format(html));
  writeFileSync(path.resolve(dir, `./src/main.js`), format(script));
  writeFileSync(path.resolve(dir, `./src/style.css`), format(style));
  return;
};
