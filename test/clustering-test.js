'use strict';
const assert = require('chai').assert;
const EventEmitter = require('events').EventEmitter;
const sinon = require('sinon');
const uncorded = require('../');

describe('clustering', () => {
  let discovery, log;

  beforeEach(() => {
    discovery = new EventEmitter();
    log = { info: sinon.spy(), warn: sinon.spy(), error: sinon.spy(), child: sinon.stub().returns(log) };
  });

  describe('successfully enabling clustering', () => {
    beforeEach(() => {
      const db = uncorded.createServer({ log: log, discovery });
      db._server.close();
    });

    it('logs that clustering was enabled', () => {
      sinon.assert.calledOnce(log.info);
      sinon.assert.calledWith(log.info, 'clustering enabled');
    });

    it('listens for peers being added', () => {
      assert.equal(discovery.listeners('peer-added').length, 1);
    });

    it('listens for peers being removed', () => {
      assert.equal(discovery.listeners('peer-removed').length, 1);
    });

    it('logs cluster discovery errors', () => {
      const err = new Error('bogus');
      discovery.emit('error', err);
      sinon.assert.calledOnce(log.error);
      sinon.assert.calledWith(log.error, err, 'cluster discovery error');
    });
  });

  it('warns when clustering method was not supplied', () => {
    const db = uncorded.createServer({ log: log });
    db._server.close();
    sinon.assert.calledOnce(log.warn);
    sinon.assert.calledWith(log.warn, 'clustering disabled: discovery method not specified');
  });

  it('throws when clustering method is invalid', () => {
    try {
      uncorded.createServer({ discovery: {} });
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.equal(err.message, 'invalid cluster discovery method');
      return;
    }
    throw new Error('expected error due to invalid clustering method');
  });
});
