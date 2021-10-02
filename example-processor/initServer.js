const http = require("http");
const handler = require("serve-handler");
const { getPort } = require("portfinder-sync");
const  sync  = require("cross-spawn")

module.exports.init = function init() {
  const port = getPort(2000);

  return new Promise((resolve) => {
    sync("git clone --depth=1 https://github.com/mrdoob/three.js.git res").on("exit", () => {

      
      const server = http.createServer((req, res) =>
      handler(req, res, { cleanUrls: false, public: "/res" })
      );
      server.listen(port);
      
      resolve(port)
    })
  });
};
