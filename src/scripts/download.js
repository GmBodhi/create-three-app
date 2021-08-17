const https = require("https");
const fs = require("fs");

module.exports = function download(dest, url, callback) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(dest, { flags: "wx" });
        file.on("finish", () => resolve());
        file.on("error", (err) => {
          file.close();
        });
        response.pipe(file);
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        download(response.headers.location, dest).then(() => resolve());
      } else {
        reject(
          `Server responded with ${response.statusCode}: ${response.statusMessage}`
        );
      }
    });

    request.on("error", (err) => {
      reject(err.message);
    });
  });
};
