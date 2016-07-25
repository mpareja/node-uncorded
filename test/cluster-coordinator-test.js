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

    it('logs that the peer was found', () => {
      const expected = { url: 'http://foo/sets/a,b' };
      sinon.assert.calledWith(log.info, sinon.match(expected), 'peer registered');
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

  describe('removing a peer from the cluster', () => {
    let stubCreateStream, stubStream, coordinator, log, sets, url;

    beforeEach(() => {
      url = 'http://foo';
      sets = { a: new StubSetStream(), b: new StubSetStream() };
      log = { info: sinon.spy(), warn: sinon.spy() };
      stubStream = new stream.Readable();
      stubStream.stop = sinon.spy();
      stubCreateStream = sinon.mock().returns(stubStream);
      coordinator = createCoordinator(log, stubCreateStream, sets);
      coordinator.register('http://foo');
    });

    it('logs that the peer was removed', () => {
      coordinator.unregister(url);

      const expected = { url: 'http://foo' };
      sinon.assert.calledWith(log.info, sinon.match(expected), 'peer unregistered');
    });

    it('stops the connection with the new peer', () => {
      coordinator.unregister(url);
      sinon.assert.calledOnce(stubStream.stop);
    });

    it('logs error if peer is not registered', () => {
      coordinator.unregister(url);
      try {
        coordinator.unregister(url);
      } catch (err) {
        assert.instanceOf(err, Error);
        assert.equal(err.message, 'peer not found');
        assert.equal(err.url, url);
        return;
      }
      assert.fail('expected error to be thrown');
    });

    it('disconnects listeners from the peer', () => {
      coordinator.unregister(url);
      assert.equal(stubStream.listenerCount('connect'), 0);
      assert.equal(stubStream.listenerCount('connectionError'), 0);
      assert.equal(stubStream.listenerCount('data'), 0);
    });

    it('stops applying changes to the set stream', () => {
      coordinator.unregister(url);

      // emit change to a
      const changeA = 'A';
      stubStream.emit('data', { a: changeA });
      
      assert.equal(sets.a.chunks.length, 0);
    });
  });
});
