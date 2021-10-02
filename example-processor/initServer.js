const http = require("http");
const handler = require("serve-handler");
const { getPort } = require("portfinder-sync");

module.exports.init = function init() {
  const port = getPort(2000);

  const server = http.createServer((req, res) =>
    handler(req, res, { cleanUrls: false })
  );
  server.listen(port);

  return port;
};
