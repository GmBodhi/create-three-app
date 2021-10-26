const { blueBright, magentaBright, greenBright, redBright } = require("chalk");

module.exports.help = () => {
  // prettier-ignore
  process.stdout.write(`
    Usage: ${greenBright("npx create-three-app")} ${blueBright("[options]") + magentaBright(" <directory>")}

    Options:
        ${blueBright("-h")}, ${blueBright("--help")}                  Prints this help message
        ${blueBright("-v")}, ${blueBright("--version")}               Prints the version number
        ${blueBright("-i")}, ${blueBright("--interactive")}           Enables interactive mode
        ${blueBright("-f")}, ${blueBright("--force")}                 Deletes all contents of the ${magentaBright("<directory>")} if not empty
        ${blueBright("-e")}, ${blueBright("--example")+ magentaBright(" <name>")}        Selects template from three.js examples
        ${blueBright("-b")}, ${blueBright("--bundler") + magentaBright(" <name>")}    \
    Selects a bundler to use: ${blueBright("<webpack|parcel>")} default: ${blueBright("webpack")}
        ${blueBright("--prefer-npm")}                Prefer npm over yarn
        
    Example:
        ${greenBright("npx create-three-app")} ${magentaBright("my-three-app")} ${blueBright("-e")} ${magentaBright("webgl_shader")}

    More information:
        Visit ${greenBright("https://github.com/GmBodhi/create-three-app")}
`);
  process.exit(0);
};

module.exports.version = () => {
  console.log(require("../../package.json").version);
  process.exit(0);
};
