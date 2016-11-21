'use strict';

const restify = require('restify');
const name = 'uncorded';

module.exports = (config, log, sets) => {
  const server = restify.createServer({ name, log });

  const audit = restify.auditLogger({ log });
  server.on('after', audit);
  server.use(restify.queryParser());

  server.get('/', (req, res, next) => {
    res.send(200, 'Hello World! ' + req.headers['user-agent']);
    next();
  });

  server.get('/sets/:ids', require('./routes/sets')(sets));

  server.listen(config.port, function () {
    log.info({ event: 'serviceStarting' }, `${name} service started successfully.`);
  });

  return server;
};
