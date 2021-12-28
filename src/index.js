#!/usr/bin/env node

"use strict";

//
// Externals
//

import { mkdirSync, mkdtempSync } from "fs";
import rimraf from "rimraf";
import path from "path";
import { tmpdir } from "os";

//

import * as utils from "./scripts/utils.js";
import resolveArgs from "./scripts/parse.js";
import init from "./scripts/initenv.js";
import manageDir from "./scripts/movedir.js";
import downloadFiles from "./scripts/downloadfiles.js";
import { selectTemplate } from "./scripts/promtTemplate.js";
import consts from "./scripts/constants.js";
import { promtBundler } from "./scripts/promtBundler.js";

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

  await utils.checkForUpdates();

  const shouldCreateDir = utils.validateDir(dir, force);

  // Ask for the template; will consider the cli arg if present
  const { isExample, example, name } = await selectTemplate({
    isExample: _isExample,
    template: _example,
    interactive,
  });

  const bundler = interactive ? await promtBundler() : _bundler;

  console.log(`Downloading ${name}`);

  //

  let tempDir = mkdtempSync(path.join(tmpdir(), "create-three-app-cache-"));
  const bundlerConfigs = (await utils.getConfig()).utils;

  //
  // Create Project Directory
  //

  if (shouldCreateDir) mkdirSync(dir);

  //
  // Downloads
  //

  //Download the common files

  await downloadFiles(
    "common",
    bundlerConfigs["common"],
    tempDir,
    utils.domain,
    consts.pathTypes.UTILS
  );

  //Download the bundler files

  await downloadFiles(
    bundler,
    bundlerConfigs[bundler],
    tempDir,
    utils.domain,
    consts.pathTypes.UTILS
  );

  // Download template

  await downloadFiles(
    name,
    example,
    tempDir,
    utils.domain,
    isExample ? consts.pathTypes.EXAMPLE : consts.pathTypes.BASIC
  );

  manageDir(tempDir, dir);

  await init(useNpm ? "npm" : await utils.checkYarn(), dir, isExample);

  rimraf.sync(tempDir);

  //
})();
