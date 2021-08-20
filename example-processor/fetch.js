const { writeFileSync, mkdirSync, existsSync } = require("fs");
const chalk = require("chalk");
const parseScript = require("./parseScript");
const parseStyle = require("./parseStyle");
const parseHtml = require("./parseHtml");
const moveDir = require("./moveDir");
const path = require("path");
const puppeteer = require("puppeteer");

let browser, page;

module.exports.launch = async ({ urls }) => {
  browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  page = await browser.newPage();
  page.on("request", (request) => {
    if (!urls["noIdea"]) urls["noIdea"] = [];
    let url = request.frame()?.url();
    if (!url) {
      console.log("No Idea");
      return urls["noIdea"].push(request.url());
    }
    if (!urls[url]) urls[url] = [];
    console.log(urls[url].push(request.url()));
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
  console.log(chalk.green(name));
  let p = await page.goto(url, { timeout: 0 });
  console.log(chalk.red("Resolved: ", name));
  // let urls = await getUrls(page);
  // console.log(chalk.yellow("Resolved urls: ", name));
  mkdirSync("./templates/" + name);
  console.log("Processing page");
  let body = await p.text();
  console.log("page.text() complete");
  let script = parseScript(body);
  let style = parseStyle(body);
  let html = parseHtml(body);
  writeFileSync(`./templates/${name}/index.html`, html);
  writeFileSync(`./templates/${name}/script.js`, script);
  writeFileSync(`./templates/${name}/style.css`, style);
  moveDir(path.resolve(__dirname, "utils"), `./templates/${name}`);
  console.log(chalk.blue("Finished: ", name));
  return;
};
