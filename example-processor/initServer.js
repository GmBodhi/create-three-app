import http from "http";
import handler from "serve-handler";
import { getPort } from "portfinder-sync";

const init = function init() {
  const port = getPort(2000);

  return new Promise((resolve) => {
    const server = http.createServer((req, res) =>
      handler(req, res, {
        cleanUrls: false,
        public: require("path").resolve(__dirname, "../res"),
      })
    );
    server.listen(port);
    resolve({ port });
  });
};
export { init };
