const { blueBright, magentaBright, greenBright } = require("chalk");

module.exports.help = () => {
  // prettier-ignore
  process.stdout.write(`
    Usage: ${greenBright("npx create-three-app")} ${blueBright("[options]") + magentaBright(" {directory}")}

    Options:
        ${blueBright("-h")}, ${blueBright("--help")}                  Print this help message
        ${blueBright("-v")}, ${blueBright("--version")}               Print the version number
        ${blueBright("-t")}, ${blueBright("--template")} ${magentaBright("{name}")}       Specify the name of the template - default: ${greenBright("basic")}
        ${blueBright("-e")}, ${blueBright("--example")}               Specify whether the the template should be an example
        ${blueBright("-f")}, ${blueBright("--force")}                 This will delete all the contents of ${magentaBright("{directory}")}
        ${blueBright("-b")}, ${blueBright("--bundler" + magentaBright(" {name}"))}    \
    Select the bundler to use ${blueBright("[webpack|parcel]")} defaults to ${blueBright("webpack")} (looking for contributors)
        ${blueBright("--prefer-npm")}                This will prefer npm when installing dependencies
        
    Example:
        ${greenBright("npx create-three-app")} ${magentaBright("my-three-app")} ${blueBright("-e -t")} ${magentaBright("webgl_shader")}

    More information:
        Visit ${greenBright("https://github.com/GmBodhi/create-three-app")}
        `);
  process.exit(0);
};

module.exports.version = () => {
  console.log(require("../../package.json").version);
  process.exit(0);
};

