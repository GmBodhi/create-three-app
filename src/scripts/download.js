const https = require("https");
const fs = require("fs");
const manageError = require("./manageError");

module.exports = function download(dest, url, callback) {
  const request = https.get(url, (response) => {
    if (response.statusCode === 200) {
      const file = fs.createWriteStream(dest, { flags: "wx" });
      file.on("finish", () => callback());
      file.on("error", (err) => {
        file.close();
        manageError(err.message);
      });
      response.pipe(file);
    } else if (response.statusCode === 302 || response.statusCode === 301) {
      download(response.headers.location, dest, callback);
    } else {
      manageError(
        `Server responded with ${response.statusCode}: ${response.statusMessage}`
      );
    }
  });

  request.on("error", (err) => {
    manageError(err.message);
  });
};
