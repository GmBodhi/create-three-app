const degit = require("degit");
const consts = require("./constants");

/**
 * Download files from GitHub repository using degit
 * @param {string} name - Name of the template/bundler/common
 * @param {string} targetDir - Target directory to clone into
 * @param {string} type - Type of path (EXAMPLE, BASIC, or UTILS)
 * @returns {Promise<void>}
 */
module.exports = async function (name, targetDir, type) {
  const basePath = () => {
    return type === consts.pathTypes.EXAMPLE
      ? "example-processor/templates/"
      : type === consts.pathTypes.BASIC
      ? "examples/"
      : "utils/";
  };

  const repoPath = `github:GmBodhi/create-three-app/${basePath()}${name}#dev`;

  const emitter = degit(repoPath, {
    cache: false,
    force: true,
    verbose: false,
  });

  try {
    await emitter.clone(targetDir);
  } catch (error) {
    console.error(`Failed to download ${name}:`, error.message);
    throw error;
  }

  return;
};
