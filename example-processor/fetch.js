import { writeFileSync, mkdirSync } from "fs";
import { cyan, red, blue } from "ansi-colors";
import parseScript from "./parseScript";
import parseShader from "./parseShader";
import parseStyle from "./parseStyle";
import parseHtml from "./parseHtml";
import puppeteer from "puppeteer";
import { JSDOM } from "jsdom";
import { format } from "prettier";
import fetch from "node-fetch";
import { minify } from "csso";

let browser,
  page,
  commomStyle = " ";

const launch = async ({ urls, json, port }) => {
  browser = await puppeteer.launch({ args: ["--no-sandbox"] });

  page = await browser.newPage();

  commomStyle = await fetch("https://threejs.org/examples/main.css")
    .then((r) => r.text())
    .catch((e) => console.log(e));

  page.on("request", (request) => {
    let url =
      request.frame()?.url()?.split("/").at(-1)?.split(".")[0] ?? "unknown";

    let reqUrl = request.url()?.split("/").at(-1) ?? "unknown";

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

const close = async () => {
  console.log(cyan("Closing browser"));

  return await browser.close();
};

const _fetch = async function (url, name) {
  console.log(red(`Resolved: ${name}`));
  let p = await page.goto(url, { timeout: 0 });

  mkdirSync("./templates/" + name);

  let { window } = new JSDOM(await p.text());

  mkdirSync("./templates/" + name + "/src");

  let { additions, replace } = parseShader({ window, name });
  let script = parseScript(window, additions, replace);
  let style = minify(`${parseStyle(window)} ${commomStyle}`).css;
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

  console.log(blue(`Finished: ${name}`));
  return;
};
export { launch, close, _fetch };
