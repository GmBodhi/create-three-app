const chalk = require("chalk");

module.exports.help = () => {
  process.stdout.write(`
    Usage: npx create-three-app ${
      chalk.blueBright("[options]") + chalk.magentaBright(" {directory}")
    }

    Options:
        ${chalk.blueBright("-h")}, ${chalk.blueBright(
    "--help"
  )}                  Print this help message
        ${chalk.blueBright("-v")}, ${chalk.blueBright(
    "--version"
  )}               Print the version number
        ${chalk.blueBright("-t")}, ${chalk.blueBright(
    "--template"
  )} ${chalk.magentaBright("{name}")}       Specify the name of the template
        ${chalk.blueBright("-e")}, ${chalk.blueBright(
    "--example"
  )}               Select templates from three.js examples
        ${chalk.blueBright("-f")}, ${chalk.blueBright(
    "--force"
  )}                 This will delete all the contents of ${chalk.magentaBright(
    "{directory}"
  )}
        ${chalk.blueBright("-b")}, ${chalk.blueBright(
    "--bundler" +chalk.magentaBright(" {name}")
  )}        Select the bundler to use ${chalk.blueBright(
    "[webpack|parcel]"
  )} (looking for a contributer)
        ${chalk.blueBright(
          "--prefer-npm"
        )}                This will prefer npm when installing dependencies
        
    Example:
        ${chalk.greenBright(
          "npx create-three-app my-three-app -e -t webgl_shader"
        )}

    More information:
        Visit ${chalk.greenBright(
          "https://github.com/GmBodhi/create-three-app"
        )}
        `);
  process.exit(0);
};

module.exports.version = () => {
  console.log(require("../../package.json").version);
  process.exit(0);
};
