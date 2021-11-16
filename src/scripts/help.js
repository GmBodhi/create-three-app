import ansiColors from "ansi-colors";

const help = () => {
  // prettier-ignore
  process.stdout.write(`
    Usage: ${ansiColors.greenBright("npx create-three-app")} ${ansiColors.blueBright("[options]") + ansiColors.magentaBright(" <directory>")}

    Options:
        ${ansiColors.blueBright("-h")}, ${ansiColors.blueBright("--help")}                  Prints this help message
        ${ansiColors.blueBright("-v")}, ${ansiColors.blueBright("--version")}               Prints the version number
        ${ansiColors.blueBright("-i")}, ${ansiColors.blueBright("--interactive")}           Enables interactive mode
        ${ansiColors.blueBright("-f")}, ${ansiColors.blueBright("--force")}                 Deletes all contents of the ${ansiColors.magentaBright("<directory>")} if not empty
        ${ansiColors.blueBright("-e")}, ${ansiColors.blueBright("--example")+ ansiColors.magentaBright(" <name>")}        Selects template from three.js examples
        ${ansiColors.blueBright("-b")}, ${ansiColors.blueBright("--bundler") + ansiColors.magentaBright(" <name>")}    \
    Selects a bundler to use: ${ansiColors.blueBright("<webpack|parcel>")} default: ${ansiColors.blueBright("webpack")}
        ${ansiColors.blueBright("--prefer-npm")}                Prefer npm over yarn
        
    Example:
        ${ansiColors.greenBright("npx create-three-app")} ${ansiColors.magentaBright("my-three-app")} ${ansiColors.blueBright("-e")} ${ansiColors.magentaBright("webgl_shader")}

    More information:
        Visit ${ansiColors.greenBright("https://github.com/GmBodhi/create-three-app")}
`);
  process.exit(0);
};

const version = () => {
  console.log(require("../../package.json").version);
  process.exit(0);
};
export { help, version };
