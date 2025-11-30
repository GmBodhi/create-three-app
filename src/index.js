#!/usr/bin/env node

"use strict";

//
// Externals
//

const { mkdirSync, existsSync } = require("fs");
const rimraf = require("rimraf");
const { redBright } = require("ansi-colors");

//

const {
  checkYarn,
  dirIsEmpty,
  error,
  checkForUpdates,
} = require("./scripts/utils");
const resolveArgs = require("./scripts/parse");
const init = require("./scripts/initenv");
const degitFiles = require("./scripts/degitfiles");
const { selectTemplate } = require("./scripts/promtTemplate");
const consts = require("./scripts/constants");

//

(async () => {
  //

  const {
    dir,
    isExample: _isExample,
    example: _example,
    force,
    useNpm,
    interactive,
  } = await resolveArgs();

  await checkForUpdates();

  // Ask for the template; will consider the cli arg if present
  const { isExample, name } = await selectTemplate({
    isExample: _isExample,
    template: _example,
    interactive,
  });

  console.log(`Downloading ${name}`);

  //
  // Validate provided directory
  //

  if (!existsSync(dir)) mkdirSync(dir);
  else {
    if (!dirIsEmpty(dir)) {
      if (!force)
        return error(
          `Provided directory {${dir}} is not empty.\n run with ${redBright(
            "-f"
          )} or ${redBright("--force")} flag to delete all the files in it.`
        );
      else {
        console.log(
          `${redBright("force flag is enabled")} Deleting ${dir}...\r`
        );
        rimraf.sync(dir);
        mkdirSync(dir);
      }
    }
  }

  //
  // Downloads using degit
  //

  //Download the common files
  console.log("Downloading common files...");
  await degitFiles("common", dir, consts.pathTypes.UTILS);

  //Download Vite configuration
  console.log("Downloading Vite configuration...");
  await degitFiles("vite", dir, consts.pathTypes.UTILS);

  // Download template
  console.log(`Downloading ${name} template...`);
  await degitFiles(
    name,
    dir,
    isExample ? consts.pathTypes.EXAMPLE : consts.pathTypes.BASIC
  );

  await init(useNpm ? "npm" : await checkYarn(), dir, isExample);

  //
})();
