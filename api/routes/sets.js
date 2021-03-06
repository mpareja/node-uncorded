'use strict';
const through = require('through');

module.exports = (sets) => (req, res) => {
  let ids = req.params.ids.split(',');

  // ignore unexpected sets: https://github.com/mpareja/node-uncorded/issues/10
  const notFound = ids.filter(id => !sets[id]);
  if (notFound.length) {
    ids = ids.filter(id => sets[id]);
    req.log.warn({ ids: notFound }, 'unexpected set id(s)');
  }

  // send pre-existing state
  const existing = ids.reduce((current, id) => {
    current[id] = sets[id].state();
    return current;
  }, {});
  res.write(JSON.stringify(existing) + '\r\n');

  const streams = ids.map(id => {
    const set = sets[id];
    const stringify = through(function (state) {
      const data = {};
      data[id] = state;
      this.queue(JSON.stringify(data) + '\r\n');
    });
    set.pipe(stringify).pipe(res);

    return stringify;
  });

  res.on('close', cleanup);
  res.on('error', cleanup);
  res.on('finish', cleanup);

  function cleanup() {
    // close stop listening for set changes since client is disconnecting
    streams.forEach(s => s.end());
    res.removeListener('close', cleanup);
    res.removeListener('error', cleanup);
    res.removeListener('finish', cleanup);
  }
};
