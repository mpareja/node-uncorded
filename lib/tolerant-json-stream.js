'use strict';
const assert = require('assert');
const Backoff = require('backoff');
const request = require('request');
const split = require('split');
const debug = require('debug')('tolerantJsonStream');

module.exports = function createRetryJsonStream(url) {
  assert(url, 'url is required');

  const splitStream = split(JSON.parse, null, { trailing: false });
  // splitStream.on('error', console.trace);
  splitStream.on('connect', onConnect);
  splitStream.on('connectionError', onConnectionError);
  splitStream.stop = stop;

  const backoff = Backoff.fibonacci({
    randomisationFactor: 0.25,
    initialDelay: 10,
    maxDelay: 1000
  });
  backoff.on('ready', onReadyForRetry);

  let req = makeRequest(url, splitStream);

  function stop() {
    req.abort();
    backoff.removeListener('ready', onReadyForRetry);
    backoff.reset(); // stop any backoff operation in progress
  }

  function onConnect() {
    backoff.reset();
  }

  function onConnectionError() {
    backoff.backoff();
  }

  function onReadyForRetry() {
    req = makeRequest(url, splitStream);
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

