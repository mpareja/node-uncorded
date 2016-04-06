'use strict';
const through = require('through');

module.exports = (sets) => (req, res, next) => {
  const ids = req.params.ids.split(',');

  // send pre-existing state
  const existing = ids.reduce((current, id) => {
    current[id] = sets[id].state();
    return current;
  }, {});
  res.write(JSON.stringify(existing) + '\r\n');

  // pipe subsequent state changes
  ids.forEach(id => {
    const set = sets[id];
    const stringify = through(function (state) {
      const data = {};
      data[id] = state;
      this.queue(JSON.stringify(data) + '\r\n');
    });
    set.pipe(stringify).pipe(res);
  });

  next();
};
