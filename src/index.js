#!/usr/bin/env node

"use strict";

//
// Externals
//

const { mkdirSync, existsSync, mkdtempSync } = require("fs");
const rimraf = require("rimraf");
const chalk = require("chalk");
const path = require("path");
const { tmpdir } = require("os");

//

const {
  domain,
  checkYarn,
  resolveArgs,
  dirIsEmpty,
  error,
  getConfig,
  checkForUpdates,
} = require("./scripts/utils");
const init = require("./scripts/initenv");
const manageDir = require("./scripts/movedir");
const downloadFiles = require("./scripts/downloadfiles");
const { selectTemplate } = require("./scripts/promtTemplate");
const consts = require("./scripts/constants");

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

  await checkForUpdates();

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
          )} or ${chalk.redBright(
            "--force"
          )} flag to delete all the files in it.`
        );
      else {
        console.log(
          `${chalk.redBright("force flag is enabled")} Deleting ${dir}...\r`
        );
        rimraf.sync(dir);
        mkdirSync(dir);
      }
    }
  }

  //

  let tempDir = mkdtempSync(path.join(tmpdir(), "create-three-app-cache-"));
  const bundlerConfigs = (await getConfig()).utils;

  //
  // Downloads
  //

  //Download the common files

  await downloadFiles(
    "common",
    bundlerConfigs["common"],
    tempDir,
    domain,
    consts.pathTypes.UTILS
  );

  //Download the bundler files

  await downloadFiles(
    bundler,
    bundlerConfigs[bundler],
    tempDir,
    domain,
    consts.pathTypes.UTILS
  );

  // Download template

  await downloadFiles(
    name,
    example,
    tempDir,
    domain,
    isExample ? consts.pathTypes.EXAMPLE : consts.pathTypes.BASIC
  );

  manageDir(tempDir, dir);

  await init(useNpm ? "npm" : await checkYarn(), dir, isExample);

  rimraf.sync(tempDir);

  //
})();
