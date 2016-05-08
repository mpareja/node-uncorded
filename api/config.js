'use strict';

const bunyan = require('bunyan');
const serializer = require('../lib/bunyan-err-serializer');

module.exports = require('rc')('uncorded', {
  port: 8080,
  discovery: {
    interval: 5000
  },
  log: {
    name: 'uncorded.api',
    serializers: {
      res: bunyan.stdSerializers.res,
      req: bunyan.stdSerializers.req,
      err: serializer
    },
    level: 'info'
  }
});
