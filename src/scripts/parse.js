const {
  yellowBright,
  greenBright,
  red,
  cyanBright,
  whiteBright,
} = require("ansi-colors");
const yargsParser = require("yargs-parser");
const { help, version } = require("./help");
const { error, getConfig } = require("./utils");
module.exports = async () => {
  const args = yargsParser(process.argv.slice(2), {
    alias: {
      interactive: "i",
      bundler: "b",
      example: "e",
      help: "h",
      version: "v",
      force: "f",
    },
    string: ["bundler", "example"],
    boolean: ["interactive", "version", "help", "prefer-npm"],
  });

  if (args.help) help();
  else if (args.v) version();
  else if (!args._.length)
    error(`Error: Please provide a directory
  ${whiteBright("Example:")}
      ${greenBright("npx create-three-app")} ${cyanBright("my-app")}
`);

  const bundlers = Object.keys((await getConfig()).utils);

  if (
    (!bundlers.includes(args.bundler) || args.bundler === "common") &&
    args.bundler
  )
    error(
      `Provided bundler (${yellowBright(
        args.bundler
      )}) could not be found in the available bundlers: \n${greenBright(
        bundlers.filter((b) => b !== "common").join("\n")
      )}\nRun with ${red("--help")} flag, to see available commands.`
    );

  return {
    dir: args._[0],
    isExample: !!args.example,
    example: args.example,
    bundler: args.bundler || "webpack",
    force: args.force,
    useNpm: args.preferNpm,
    interactive: args.interactive,
  };
};
