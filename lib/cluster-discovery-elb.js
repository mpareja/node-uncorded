'use strict';
const _ = require('lodash');
const EventEmitter = require('events').EventEmitter;
const listElbHealthyInstances = require('./list-elb-healthy-instances');

module.exports = startClusterDiscovery;

function startClusterDiscovery(options) {
  const interval = options.interval || 5000;
  const schedule = options.schedule || (fn => setTimeout(fn, interval));
  const list = options.list || /* istanbul ignore next */ listElbHealthyInstances;
  const port = options.port || 8199;
  const emitter = new EventEmitter();
  let previous = [];
  let previousIndex = {};

  discover();
  
  function discover() {
    list(options.region, options.elbName, (err, peers) => {
      if (err) {
        err.region = options.region;
        err.elbName = options.elbName;
        emitter.emit('error', err);
        schedule(discover);
        return;
      }

      const added = peers.filter(p => !previousIndex[p]);
      added.forEach(p => emitter.emit('peer-added', `http://${p}:${port}`));

      const peersIndex = _.keyBy(peers);
      const removed = previous.filter(p => !peersIndex[p]);
      removed.forEach(p => emitter.emit('peer-removed', `http://${p}:${port}`));

      previous = peers;
      previousIndex = peersIndex;

      schedule(discover);
    });
  }

  return emitter;
}
