#!/usr/bin/env node

"use strict";

//
// Externals
//

import { mkdirSync, existsSync, mkdtempSync } from "fs";
import rimraf from "rimraf";
import { redBright } from "ansi-colors";
import path from "path";
import { tmpdir } from "os";

//

import {
  domain,
  checkYarn,
  dirIsEmpty,
  error,
  getConfig,
  checkForUpdates,
} from "./scripts/utils";
import resolveArgs from "./scripts/parse";
import init from "./scripts/initenv";
import manageDir from "./scripts/movedir";
import downloadFiles from "./scripts/downloadfiles";
import { selectTemplate } from "./scripts/promtTemplate";
import consts from "./scripts/constants";
import { promtBundler } from "./scripts/promtBundler";

//

(async () => {
  //

  const {
    dir,
    isExample: _isExample,
    example: _example,
    bundler: _bundler,
    force,
    useNpm,
    interactive,
  } = await resolveArgs();

  await checkForUpdates();

  // Ask for the template; will consider the cli arg if present
  const { isExample, example, name } = await selectTemplate({
    isExample: _isExample,
    template: _example,
    interactive,
  });

  const bundler = interactive ? await promtBundler() : _bundler;

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
