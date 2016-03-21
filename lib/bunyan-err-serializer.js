'use strict';

var bunyan = require('bunyan');
var ignored = ['domain', 'domainEmitter', 'domainBound'];

module.exports = function serializeError(err) {
  var prop;
  var result = bunyan.stdSerializers.err(err);
  for (prop in err) {
    if (err.hasOwnProperty(prop) && ignored.indexOf(prop) < 0) {
      if (err[prop] instanceof Error) {
        result[prop] = serializeError(err[prop]);
      } else {
        result[prop] = err[prop];
      }
    }
  }
  return result;
};
