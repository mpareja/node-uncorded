const EventEmitter = require('events').EventEmitter;
function startClusterDiscovery(peers) {
  const emitter = new EventEmitter();
  setImmediate(() => {
    peers.forEach(p => emitter.emit('peer-added', p));
  });
  return emitter;
}

module.exports = startClusterDiscovery;
