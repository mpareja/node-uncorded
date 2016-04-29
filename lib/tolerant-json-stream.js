'use strict';
const assert = require('assert');
const request = require('request');
const split = require('split');
const debug = require('debug')('tolerantJsonStream');

module.exports = function createRetryJsonStream(url) {
  assert(url, 'url is required');

  let stopped = false;

  const splitStream = split(JSON.parse, null, { trailing: false });
  // splitStream.on('error', console.trace);
  splitStream.on('connectionError', onConnectionError);
  splitStream.stop = stop;

  let req = makeRequest(url, splitStream);

  function stop() {
    stopped = true;
    req.abort();
  }

  function onConnectionError() {
    if (!stopped) {
      req = makeRequest(url, splitStream);
    }
  }

  return splitStream;
};

function makeRequest(url, splitStream) {
  debug('req request');
  const req = request(url);
  req.once('response', () => {
    debug('req response');
    splitStream.emit('connect');
  });
  req.on('abort', () => { // only triggered internally
    debug('req abort');
  });
  req.on('end', () => {
    debug('req end');
    splitStream.emit('connectionError', new Error('server ended request'));
  });
  req.on('error', err => {
    debug('req error', err);
    splitStream.emit('connectionError', err);
  });

  req.pipe(splitStream, { end: false });

  return req;
}

