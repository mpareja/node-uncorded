'use strict';
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
      const added = peers.filter(p => !previous[p]);
      added.forEach(p => emitter.emit('peer-added', `http://${p}:${port}`));

      const removed = previous.filter(p => !peers[p]);
      removed.forEach(p => emitter.emit('peer-removed', `http://${p}:${port}`));

      previous = peers;
      schedule(discover);
    });
  }

  return emitter;
}
