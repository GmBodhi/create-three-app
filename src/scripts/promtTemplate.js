import * as ansiColors from "ansi-colors";
// @ts-ignore
import { AutoComplete } from "enquirer";
import { getConfig, error } from "./utils";

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
    ansiColors.yellowBright("DISCLAIMER: "),
    "Using an example from three.js may cause unresolved resource urls, which you may have to resolve..."
  );

  return { example: config[example], name: example };
}

async function selectFromBasic({ isExample, template, interactive }) {
  const { basic: config } = await getConfig().catch((e) =>
    console.log(
      ansiColors.red("An error occurred while fetching the config file"),
      e
    )
  );
  const threeExamples = Object.keys(config);

  if (interactive) {
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

    if (example === "Select from threejs examples")
      return { isExample: true, ...(await selectFromExamples(template)) };

    return {
      isExample: false,
      example: config[example],
      name: example,
    };
  }

  if (isExample)
    return { isExample: true, ...(await selectFromExamples(template)) };

  return {
    isExample: false,
    example: config[threeExamples[0]],
    name: threeExamples[0],
  };
}

const selectTemplate = selectFromBasic;
export { selectTemplate };
