const http = require("http");
const handler = require("serve-handler");
const { getPort } = require("portfinder-sync");

module.exports.init = function init() {
  const port = getPort(2000);

  return new Promise((resolve) => {
    const server = http.createServer((req, res) =>
      handler(req, res, {
        cleanUrls: false,
        public: require("path").resolve(__dirname, "../res"),
      })
    );
    server.listen(port);
    resolve(port);
  });
};
