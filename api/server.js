'use strict';

const http = require('http');
const uuid = require('uuid');
const name = 'uncorded';

module.exports = (config, log, sets) => {
  const port = Number(config.port);
  const setsRoute = require('./routes/sets')(sets);

  const server = http.createServer((req, res) => {
    req.params = {};
    req.log = log.child({ req_id: uuid.v4() });
    req.log.info({ req }, 'incoming http request');

    // get /
    if (req.method === 'GET' && (req.url === '/' || req.url === '')) {
      res.write('Hello World! ' + req.headers['user-agent']);
      res.end();
      return;
    }

    // get /sets/:ids
    if (req.method === 'GET' && req.url.substr(0, 6) === '/sets/') {
      req.params.ids = req.url.substr(6);
      setsRoute(req, res);
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(port, () => {
    log.info({ event: 'serviceStarting', port }, `${name} service started successfully.`);
  });

  return server;
};
