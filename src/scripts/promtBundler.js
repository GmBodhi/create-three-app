import { getConfig, error } from "./utils.js";
//@ts-ignore
import  enquirer from "enquirer";

async function promtBundler() {
  const config = (await getConfig()).utils;

  const bundlers = Object.keys(config).filter((key) => key !== "common");

  const bundler = await new enquirer.AutoComplete({
    name: "Bundler",
    message: "Which bundler do you want to use?",
    choices: bundlers,
  })
    .run()
    .catch((e) => {
      console.error(e);
      error("Process aborted");
    });

  return bundler;
}

export { promtBundler };
