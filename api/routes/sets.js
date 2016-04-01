'use strict';
const through = require('through');

module.exports = (sets) => (req, res, next) => {
  const set = sets[req.params.id];
  const stringify = through(function (data) {
    this.queue(JSON.stringify(data) + '\n');
  });

  set.pipe(stringify).pipe(res);
  next();
};
