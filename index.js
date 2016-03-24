'use strict';
const bunyan = require('bunyan');
const createServer = require('./api/server');

exports.createServer = () => {
  const config = require('./api/config.js');
  const log = bunyan.createLogger(config.log);
  const server = createServer(config, log);

  return {
    _server: server
  };
};
