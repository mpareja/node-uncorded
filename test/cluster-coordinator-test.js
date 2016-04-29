'use strict';
const assert = require('chai').assert;
const createCoordinator = require('../lib/cluster-coordinator');
const sinon = require('sinon');
const stream = require('stream');

class StubSetStream extends stream.Writable {
  constructor() {
    super();
    this.chunks = [];
  }
  _write(chunk, encoding, callback) {
    this.chunks.push(chunk);
    callback(null);
  }
}

describe('cluster-coordinator', () => {
  describe('adding a peer to the cluster', () => {
    let stubCreateStream, stubStream, coordinator, log, sets;

    beforeEach(() => {
      sets = { a: new StubSetStream(), b: new StubSetStream() };
      log = { info: sinon.spy(), warn: sinon.spy() };
      stubStream = new stream.Readable();
      stubCreateStream = sinon.mock().returns(stubStream);
      coordinator = createCoordinator(log, stubCreateStream, sets);
      coordinator.register('http://foo');
    });

    it('establishes a connection with the new peer', () => {
      sinon.assert.calledWith(stubCreateStream, 'http://foo/sets/a,b');
    });

    it('applies changes from the peer to the correct set streams', () => {
      // emit change to a
      const changeA = 'A';
      stubStream.emit('data', { a: changeA });

      // assert change applied to A only
      assert.equal(sets.a.chunks.length, 1);
      assert.equal(sets.a.chunks[0], changeA);
      assert.equal(sets.b.chunks.length, 0);

      // emit change to b
      const changeB = 'B';
      stubStream.emit('data', { b: changeB });
      // assert change applied to B only
      assert.equal(sets.a.chunks.length, 1);
      assert.equal(sets.b.chunks.length, 1);
      assert.equal(sets.b.chunks[0], changeB);
    });

    it('logs successful connection to the peer', () => {
      sinon.assert.notCalled(log.info);

      stubStream.emit('connect');

      const expected = { url: 'http://foo/sets/a,b' };
      sinon.assert.calledWith(log.info, sinon.match(expected), 'peer connection established');
    });

    it('logs connection failures', () => {
      sinon.assert.notCalled(log.warn);

      const err = new Error('BOGUS');
      stubStream.emit('connectionError', err);

      const expected = { err, url: 'http://foo/sets/a,b' };
      sinon.assert.calledWith(log.warn, sinon.match(expected), 'peer connection failure');
    });
  });

  describe('removing a node from the cluster', () => {
    it('stops the connection with the new node');
    it('stop applying changes to set streams');
  });
});
