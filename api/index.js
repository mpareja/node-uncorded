'use strict';

const bunyan = require('bunyan');
let log = bunyan.createLogger({ name: 'uncorded' });

// ensure we log early failures - including configuration issues
process.on('uncaughtException', err => {
  log.error(err, 'uncaught exception, aborting process');
  process.abort();
});

const config = require('./config.js');
log = bunyan.createLogger(config.log);

const createServer = require('./server.js');
createServer(config, log);
