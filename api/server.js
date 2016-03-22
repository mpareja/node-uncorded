'use strict';

const restify = require('restify');
const name = 'uncorded';

module.exports = (config, log) => {
  const server = restify.createServer({ name, log });

  server.on('after', restify.auditLogger({ log }));

  server.get('/', (req, res, next) => {
    res.send(200, 'Hello World! ' + req.headers['user-agent']);
    next();
  });

  server.listen(config.port, function () {
    log.info({ event: 'serviceStarting' }, `${name} service started successfully.`);
  });

  return server;
};