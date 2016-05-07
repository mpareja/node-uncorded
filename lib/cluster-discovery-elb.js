'use strict';
const EventEmitter = require('events').EventEmitter;

module.exports = startClusterDiscovery;

function startClusterDiscovery(options) {
  const schedule = options.schedule;
  const list = options.listElbHealthInstances;
  const emitter = new EventEmitter();
  let previous = [];

  discover();
  
  function discover() {
    list(options.region, options.elbName, (err, peers) => {
      if (err) {
        emitter.emit('error', err);
        schedule(discover);
        return;
      }
      const added = peers.filter(p => !previous[p]);
      added.forEach(p => emitter.emit('peer-added', p));

      const removed = previous.filter(p => !peers[p]);
      removed.forEach(p => emitter.emit('peer-removed', p));

      previous = peers;
      schedule(discover);
    });
  }

  return emitter;
}
