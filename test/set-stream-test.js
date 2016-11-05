'use strict';
const assert = require('chai').assert;
const SetStream = require('../lib/set-stream');
const sinon = require('sinon');
const Set = require('../lib/set');

describe('set-stream', () => {
  let meta;
  let ss;
  let states;

  beforeEach(() => {
    states = [];
    ss = new SetStream(new Set());
    ss.on('data', states.push.bind(states));
  });

  describe('add', () => {
    beforeEach(done => {
      ss.on('end', done);

      meta = ss.add({ foo: 'bar' });
      ss.push(null); // end the readable stream
    });

    it('adds key to set', () => {
      const result = ss.get(meta.id);
      assert.deepEqual(result.doc, { foo: 'bar' });
    });

    it('emits a single state snapshot including the new item', () => {
      assert.equal(states.length, 1);

      const adds = states[0].adds;
      const removals = states[0].removals;
      assert.equal(Object.keys(adds).length, 1);
      assert.equal(Object.keys(removals).length, 0);

      const item = adds[meta.id];
      assert.equal(item.id, meta.id);
      assert.deepEqual(item.doc, { foo: 'bar' });
    });
  });

  describe('remove', () => {
    beforeEach(done => {
      ss.on('end', done);

      meta = ss.add({ foo: 'bar' });
      ss.remove(meta.id);
      ss.push(null); // end the readable stream
    });

    it('removes key from set', () => {
      const result = ss.get(meta.id);
      assert.isUndefined(result);
    });

    it('emits state snapshot including the removed item', () => {
      assert.equal(states.length, 2);

      const removals = states[0].removals;
      assert.equal(Object.keys(removals).length, 1);

      const item = removals[meta.id];
      assert.equal(item, meta.id);
    });
  });

  it('merges states from upstream', (done) => {
    const upstream = new Set();

    ss._set.merge = sinon.spy();
    ss.on('finish', () => {
      sinon.assert.calledWith(ss._set.merge, upstream);
      done();
    });

    ss.write(upstream);
    ss.end();
  });

  it('exposes state', () => {
    const state = ss.state();
    assert.isObject(state);
    assert.deepEqual(state.adds, ss._set.adds);
    assert.deepEqual(state.removals, ss._set.removals);
  });

  it('requires a set', () => {
    assert.throws(() => new SetStream());
  });
});

describe('set-stream - full-circle', () => {
  let a, ameta, b, bmeta;
  beforeEach(done => {
    let adone = false, bdone = false;
    a = new SetStream(new Set());
    b = new SetStream(new Set());
    a.pipe(b).pipe(a);
    a.on('finish', () => {
      // done replicating from a -> b
      adone = true;
      end();
    });
    b.on('finish', () => {
      // done replicating from b -> a
      bdone = true;
      end();
    });

    ameta = a.add({ foo: 'bar' });
    bmeta = b.add({ baz: 'oof' });

    setImmediate(() => {
      a.end();
      b.end();
    });

    function end() {
      adone && bdone && done();
    }
  });

  it('replicates from a -> b', () => {
    const data = b.get(ameta.id);
    assert.isDefined(data);
    assert.equal(data.id, ameta.id);
    assert.deepEqual(data.doc, { foo: 'bar' });
  });

  it('replicates from b -> a', () => {
    const data = a.get(bmeta.id);
    assert.isDefined(data);
    assert.equal(data.id, bmeta.id);
    assert.deepEqual(data.doc, { baz: 'oof' });
  });
});
