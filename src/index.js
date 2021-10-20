#!/usr/bin/env node

"use strict";

//
// Externals
//

const { mkdirSync, existsSync, mkdtempSync } = require("fs");
const rimraf = require("rimraf");
const chalk = require("chalk");

//

const {
  domain,
  checkYarn,
  resolveArgs,
  consts,
  dirIsEmpty,
  error,
  getBundlersConfig,
} = require("./scripts/utils");
const init = require("./scripts/initenv");
const manageDir = require("./scripts/movedir");
const downloadFiles = require("./scripts/downloadfiles");
const { selectTemplate } = require("./scripts/promtTemplate");

//

(async () => {
  //

  const {
    dir,
    isExample: _isExample,
    template,
    bundler,
    force,
    useNpm,
  } = await resolveArgs();

  // Ask for the template; will consider the cli arg if present
  const { isExample, example, name } = await selectTemplate({
    isExample: _isExample,
    template,
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
          `Provided directory {${dir}} is not empty.\n run with ${chalk.redBright(
            "-f"
          )} or ${chalk.redBright("--force")} flag`
        );
      else {
        rimraf.sync(dir);
        mkdirSync(dir);
      }
    }
  }

  //

  init(useNpm ? "npm" : await checkYarn(), dir, isExample);

  let tempDir = mkdtempSync("create-three-app-cache-");
  const bundlerConfigs = await getBundlersConfig();

  //
  // Downloads
  //

  //Download the common files
  downloadFiles(
    "common",
    bundlerConfigs["common"],
    tempDir,
    dir,
    domain,
    consts.pathTypes.UTILS
  )
    // Move files to target dir
    .then(manageDir);

  //Download the bundler files
  downloadFiles(
    bundler,
    bundlerConfigs[bundler],
    tempDir,
    dir,
    domain,
    consts.pathTypes.UTILS
  )
    // Move files to target dir
    .then(manageDir);

  // Download template
  downloadFiles(
    name,
    example,
    tempDir,
    dir,
    domain,
    isExample ? consts.pathTypes.EXAMPLE : consts.pathTypes.BASIC
  )
    // Move files to target dir
    .then(manageDir);

  //
})();
