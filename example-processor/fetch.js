const { writeFileSync, mkdirSync, existsSync } = require("fs");
const chalk = require("chalk");
const parseScript = require("./parseScript");
const parseStyle = require("./parseStyle");
const parseHtml = require("./parseHtml");
const moveDir = require("./moveDir");
const path = require("path");
const puppeteer = require("puppeteer");

let browser, page;

module.exports.launch = async ({ urls, json }) => {
  browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  page = await browser.newPage();
  page.on("request", (request) => {
    let url = request.frame()?.url() ?? "unknown";
    let resUrls = request.url()?.split("/");
    if ([
        "https://threejs.org/build/three.module.js",
        "https://threejs.org/examples/jsm/libs/stats.module.js",
        "https://threejs.org/examples/jsm/libs/dat.gui.module.js",
      ].includes(request.url())) return;
    console.log(resUrl?.pop().split(".")[0]);
    if (!urls[url]) urls[url] = [];
    urls[url].push(request.url());
  });
  return;
};
function getUrls(page) {
  return new Promise((resolve, reject) => {
    let urls = [];
    function onCollect(request) {
      console.log("Collecting");
      let url = request.frame()?.url();
      if (!url) return;
      urls.push(url);
    }
    let handleDispose = () => {
      console.log("Dispossing");
      page.removeListener("request", onCollect);
      page.removeListener("requestfinished", handleDispose);
      resolve(urls);
    };
    page.on("request", onCollect);
    page.on("requestfinished", handleDispose);
    page.on("requestfailed", reject);
  });
}

module.exports.close = async () => {
  console.log(chalk.cyan("Closing browser"));
  return await browser.close();
};

module.exports.fetch = async function (url, name) {
  console.log(chalk.red("Resolved: ", name));
  let p = await page.goto(url, { timeout: 0 });
  mkdirSync("./templates/" + name);
  let body = await p.text();
  let script = parseScript(body);
  let style = parseStyle(body);
  let html = parseHtml(body);
  mkdirSync("./templates/" + name + "/src");
  writeFileSync(`./templates/${name}/src/index.html`, html);
  writeFileSync(`./templates/${name}/src/main.js`, script);
  writeFileSync(`./templates/${name}/src/style.css`, style);
  moveDir(path.resolve(__dirname, "utils"), `./templates/${name}`);
  console.log(chalk.blue("Finished: ", name));
  return;
};
