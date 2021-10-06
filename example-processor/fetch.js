const { writeFileSync, mkdirSync } = require("fs");
const chalk = require("chalk");
const parseScript = require("./parseScript");
const parseShader = require("./parseShader");
const parseStyle = require("./parseStyle");
const parseHtml = require("./parseHtml");
const moveDir = require("./moveDir");
const path = require("path");
const puppeteer = require("puppeteer");
const { JSDOM } = require("jsdom");
const { format } = require("prettier");

let browser, page;

module.exports.launch = async ({ urls, json, port }) => {
  browser = await puppeteer.launch({ args: ["--no-sandbox"] });

  page = await browser.newPage();

  page.on("request", (request) => {
    let url =
      request.frame()?.url()?.split("/").at(-1)?.split(".")[0] ?? "unknown";

    let reqUrl =
      request.url()?.split("/")[
        request.frame()?.url()?.split("/").length - 1
      ] ?? "unknown";

    if (json.includes(url)) return;

    if (
      [
        `http://localhost:${port}/build/three.module.js`,
        `http://localhost:${port}/examples/jsm/libs/stats.module.js`,
        `http://localhost:${port}/examples/jsm/libs/dat.gui.module.js`,
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

module.exports.fetch = async function (url, name) {
  console.log(chalk.red("Resolved: ", name));
  let p = await page.goto(url, { timeout: 0, waitUntil: "networkidle0" });

  mkdirSync("./templates/" + name);

  let { window } = new JSDOM(await p.text());

  mkdirSync("./templates/" + name + "/src");

  let { additions, replace } = parseShader(window, name);
  let script = parseScript(window, additions, replace);
  let style = parseStyle(window);
  let html = parseHtml(window);

  writeFileSync(
    `./templates/${name}/src/index.html`,
    format(html, { parser: "html" })
  );
  writeFileSync(
    `./templates/${name}/src/main.js`,
    format(script, { parser: "babel" })
  );
  writeFileSync(
    `./templates/${name}/src/style.css`,
    format(style, { parser: "css" })
  );

  moveDir(path.resolve(__dirname, "utils"), `./templates/${name}`);

  console.log(chalk.blue("Finished: ", name));
  return;
};
