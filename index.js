'use strict';
const bunyan = require('bunyan');
const createServer = require('./api/server');
const ExpiringSet = require('./lib/expiring-set');
const Set = require('./lib/set');
const SetStream = require('./lib/set-stream');

exports.createServer = (options) => {
  options = options || {};
  const config = require('./api/config.js');
  const log = options.log || bunyan.createLogger(config.log);
  const sets = {};

  if (!options.discovery) {
    log.warn('clustering disabled: discovery method not specified');
  } else {
    let discovery;

    if (typeof options.discovery.on === 'function') {
      discovery = options.discovery;
    } else if (typeof options.discovery.type === 'string' && exports.discovery[options.discovery.type]) {
      discovery = exports.discovery[options.discovery.type](options.discovery.options);
    } else {
      throw new Error('invalid cluster discovery method');
    }

    log.info('clustering enabled');
    const connectToPeer = require('./lib/tolerant-json-stream');
    const coordinator = require('./lib/cluster-coordinator')(log, connectToPeer, sets);
    discovery.on('peer-added', coordinator.register);
    discovery.on('peer-removed', coordinator.unregister);
    discovery.on('error', err => {
      log.error(err, 'cluster discovery error');
    });
  }

  const server = createServer(config, log, sets);

  return {
    createSet(name, options) {
      // assert name is not in sets already
      return sets[name] = new SetStream(new Set(options));
    },
    createExpiringSet(name, options) {
      // assert name is not in sets already
      return sets[name] = new SetStream(new ExpiringSet(options));
    },
    _server: server
  };
};
exports.discovery = {
  elb: require('./lib/cluster-discovery-elb'),
  static: require('./lib/cluster-discovery-static')
};
