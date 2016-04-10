const through2 = require('through2');
const monitorLoadBalancer = require();

// HERE: doing throw-away spike of what cluster discovery
// might look like

module.exports = (log) => {
  const cluster = {};

  // monitor for cluster changes
  const monitor = monitorLoadBalancer();
  monitor.on('error', err => {
    log.error(err, 'error monitoring for cluster changes');
  });

  // ensure cluster changes are applied in-order, one at a time
  const update = through2((change, enc, cb) => {
    if (change.type === 'node-added') {
      cluster.register(change.node, cb);
    } else {
      cluster.unregister(change.node, cb);
    }
  });
  update.on('error', err => {
    log.error(err, 'error applying cluster changes');
  });

  // log cluster changes
  const changelog = through2((change, enc, cb) => {
    log.info({ change: change }, 'cluster change applied');
    cb();
  });

  monitor.pipe(update).pipe(changelog);

  return {
    close() {
    }
  };
};
