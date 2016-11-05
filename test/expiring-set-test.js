'use strict';

const assert = require('chai').assert;
const Set = require('../lib/expiring-set');

let i = 0;
const createSet = () => new Set({ ttl: 50 });
const createDoc = () => {
  return { data: i++ };
};

describe('expiring-set', () => {
  it('can add item', () => {
    const set = createSet();
    const doc = createDoc();
    const metadata = set.add(doc);
    assert.equal(typeof(metadata.id), 'string');
    assert.equal(metadata.id.length, 36);
  });

  describe('given an expired item', () => {
    const test = {};

    beforeEach(done => {
      test.set = new Set({ ttl: 50 });
      test.metadata = test.set.add(createDoc());
      setTimeout(done, 51);
    });

    expiredItemTests(test);
  });

  function expiredItemTests(test) {
    it('the item cannot be retrieved', () => {
      const found = test.set.get(test.metadata.id);
      assert.isUndefined(found);
    });

    it('the item is evicted from state after retrieval to reclaim memory', () => {
      test.set.get(test.metadata.id);
      const state = test.set.state();
      assert.isUndefined(state.adds[test.metadata.id]);
    });

    it('the item is evicted from state by garbage collection', () => {
      test.set.gc();
      const state = test.set.state();
      assert.isUndefined(state.adds[test.metadata.id]);
    });

    it.skip('the item is evicted from state automatically to reclaim memory', () => {
      const state = test.set.state();
      assert.isUndefined(state.adds[test.metadata.id]);
    });

    it('garbage collection continues working after expiring all items in set', (done) => {
      const newdoc = test.set.add(createDoc());
      setTimeout(() => {
        test.set.gc();
        const state = test.set.state();
        assert.isUndefined(state.adds[newdoc.id]);
        done();
      }, 51);
    });
  }

  describe('given an expired item and a non-expired item', () => {
    let activeMetadata, expiredMetadata, set;
    beforeEach((done) => {
      set = new Set({ ttl: 50 });
      const expired = createDoc();
      expiredMetadata = set.add(expired);
      setTimeout(() => {
        const active = createDoc();
        activeMetadata = set.add(active);
        setTimeout(() => {
          done();
        }, 51 - 15);
      }, 15);
    });

    it('non-expired item can still be retrieved', () => {
      const found = set.get(activeMetadata.id);
      assert.isDefined(found);
    });

    it('non-expired item is still in state', () => {
      set.gc();
      const state = set.state();
      assert.isDefined(state.adds[activeMetadata.id]);
    });

    it('expired item cannot be retrieved', () => {
      const found = set.get(expiredMetadata.id);
      assert.isUndefined(found);
    });

    it('expired item is evicted from state after retrieval to reclaim memory', () => {
      set.get(expiredMetadata.id);
      const state = set.state();
      assert.isUndefined(state.adds[expiredMetadata.id]);
    });
  });

  it('generates unique id for each item', () => {
    const set = createSet();
    const first = set.add(createDoc());
    const second = set.add(createDoc());
    assert.notEqual(first.id, second.id);
  });

  it('can retrieve previously added item', () => {
    const set = createSet();
    const doc = createDoc();
    const metadata = set.add(doc);
    const found = set.get(metadata.id);
    assert.deepEqual(found.doc, doc);
    assert.notEqual(found, doc, 'persists a copy of original');
  });

  it('can remove an item', () => {
    const set = createSet();
    const doc = createDoc();
    const metadata = set.add(doc);

    const removed = set.remove(metadata.id);
    assert.deepEqual(removed, metadata);
    const found = set.get(metadata.id);
    assert.isUndefined(found);
  });

  it('can merge adds', () => {
    const a = createSet();
    const adoc = createDoc();
    const ameta = a.add(adoc);

    const b = createSet();
    const bdoc = createDoc();
    const bmeta = b.add(bdoc);

    a.merge(b.state());
    assert.deepEqual(a.get(ameta.id).doc, adoc);
    assert.deepEqual(a.get(bmeta.id).doc, bdoc);
  });

  it('can merge removals', () => {
    const a = createSet();
    const adoc = createDoc();
    const ameta = a.add(adoc);

    const b = createSet();
    b.merge(a.state()); // capture addition so it can be removed
    b.remove(ameta.id);

    a.merge(b.state());
    assert.isUndefined(a.get(ameta.id));
  });

  it('only tombstone removals for items already in set', () => {
    const a = createSet();
    const adoc = createDoc();
    const ameta = a.add(adoc);

    const b = createSet();
    const removed = b.remove(ameta.id);

    a.merge(b.state());

    assert.isUndefined(removed);
    assert.deepEqual(a.get(ameta.id), ameta);
  });
});
