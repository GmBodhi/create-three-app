const chalk = require("chalk");
// @ts-ignore
const { AutoComplete } = require("enquirer");
const { getConfig, error } = require("./utils");

async function selectFromExamples(template = "Not_an_example") {
  const { examples: config } = await getConfig();

  if (config[template]) return { example: config[template], name: template };

  const example = await new AutoComplete({
    name: "Example",
    message: "Select example",
    choices: Object.keys(config),
  })
    .run()
    .catch((e) => {
      console.error(e);
      error("Process aborted");
    });

  console.log(
    chalk.yellowBright("DISCLAIMER: "),
    "Using an example from three.js may cause unresolved resource urls, which you may have to resolve..."
  );

  return { example: config[example], name: example };
}

async function selectFromBasic({ isExample, template }) {
  const { basic: config } = await getConfig().catch((e) =>
    console.log(
      chalk.red("An error occurred while fetching the config file"),
      e
    )
  );

  if (isExample)
    return { isExample: true, ...(await selectFromExamples(template)) };

  const threeExamples = Object.keys(config);

  if (threeExamples.includes(template))
    return { isExample: false, example: config[template], name: template };

  const examples = [...threeExamples, "Select from threejs examples"];

  const example = await new AutoComplete({
    name: "Example",
    message: "Which template do you want to use?",
    choices: examples,
  })
    .run()
    .catch((e) => {
      console.error(e);
      error("Process aborted");
    });

  return example === "Select from threejs examples"
    ? { isExample: true, ...(await selectFromExamples()) }
    : { isExample: false, example: config[example], name: example };
}

module.exports.selectTemplate = selectFromBasic;
