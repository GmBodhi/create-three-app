const { greenBright, cyanBright, whiteBright } = require("ansi-colors");
const yargsParser = require("yargs-parser");
const { help, version } = require("./help");
const { error } = require("./utils");
module.exports = async () => {
  const args = yargsParser(process.argv.slice(2), {
    alias: {
      interactive: "i",
      example: "e",
      help: "h",
      version: "v",
      force: "f",
    },
    string: ["example"],
    boolean: ["interactive", "version", "help", "prefer-npm"],
  });

  if (args.help) help();
  else if (args.v) version();
  else if (!args._.length)
    error(`Error: Please provide a directory
  ${whiteBright("Example:")}
      ${greenBright("npx create-three-app")} ${cyanBright("my-app")}
`);

  return {
    dir: args._[0],
    isExample: !!args.example,
    example: args.example,
    force: args.force,
    useNpm: args.preferNpm,
    interactive: args.interactive,
  };
};
