'use strict';
const bunyan = require('bunyan');
const createServer = require('./api/server');
const SetStream = require('./lib/set-stream');
const clusterDiscovery = require('./lib/cluster-discovery');

exports.createServer = () => {
  const config = require('./api/config.js');
  const log = bunyan.createLogger(config.log);
  const sets = {};
  const server = createServer(config, log, sets);
  const cluster = clusterDiscovery(log);

  return {
    createSet(name) {
      // assert name is not in sets already
      return sets[name] = new SetStream();
    },
    close: () => {
      cluster.close();
    },
    _server: server
  };
};
