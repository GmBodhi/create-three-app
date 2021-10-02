const http = require("http");
const handler = require("serve-handler");
const { getPort } = require("portfinder-sync");
const { default: fetch } = require("node-fetch");

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
    fetch("http://localhost:2000/exaples/files.json")
      .then((res) => res.text())
      .then(console.log);
    resolve(port);
  });
};
