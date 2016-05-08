'use strict';
const bunyan = require('bunyan');
const createServer = require('./api/server');
const SetStream = require('./lib/set-stream');

exports.createServer = (options) => {
  options = options || {};
  const config = require('./api/config.js');
  const log = options.log || bunyan.createLogger(config.log);
  const sets = {};

  const discovery = options.discovery;
  if (!discovery) {
    log.warn('clustering disabled: discovery method not specified');
  } else if (typeof discovery.on === 'function') {
    log.info('clustering enabled');

    const connectToPeer = require('./lib/tolerant-json-stream');
    const coordinator = require('./lib/cluster-coordinator')(log, connectToPeer, sets);
    discovery.on('peer-added', coordinator.register);
    discovery.on('peer-removed', coordinator.unregister);
    discovery.on('error', err => {
      log.error(err, 'cluster discovery error');
    });
  } else {
    throw new Error('invalid cluster discovery method');
  }

  const server = createServer(config, log, sets);

  return {
    createSet(name) {
      // assert name is not in sets already
      return sets[name] = new SetStream();
    },
    _server: server
  };
};
exports.discovery = {
  elb: require('./lib/cluster-discovery-elb')
};
