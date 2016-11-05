'use strict';

const assert = require('chai').assert;
const Set = require('../lib/set');

let i = 0;
const createDoc = () => {
  return { data: i++ };
};

describe('set', () => {
  it('can add item', () => {
    const set = new Set();
    const doc = createDoc();
    const metadata = set.add(doc);
    assert.equal(typeof(metadata.id), 'string');
    assert.equal(metadata.id.length, 36);
  });

  it('generates unique id for each item', () => {
    const set = new Set();
    const first = set.add(createDoc());
    const second = set.add(createDoc());
    assert.notEqual(first.id, second.id);
  });

  it('can retrieve previously added item', () => {
    const set = new Set();
    const doc = createDoc();
    const metadata = set.add(doc);
    const found = set.get(metadata.id);
    assert.deepEqual(found.doc, doc);
    assert.notEqual(found, doc, 'persists a copy of original');
  });

  it('can remove an item', () => {
    const set = new Set();
    const doc = createDoc();
    const metadata = set.add(doc);

    const removed = set.remove(metadata.id);
    assert.deepEqual(removed, metadata);
    const found = set.get(metadata.id);
    assert.isUndefined(found);
  });

  it('can merge adds', () => {
    const a = new Set();
    const adoc = createDoc();
    const ameta = a.add(adoc);

    const b = new Set();
    const bdoc = createDoc();
    const bmeta = b.add(bdoc);

    a.merge(b.state());
    assert.deepEqual(a.get(ameta.id).doc, adoc);
    assert.deepEqual(a.get(bmeta.id).doc, bdoc);
  });

  it('can merge removals', () => {
    const a = new Set();
    const adoc = createDoc();
    const ameta = a.add(adoc);

    const b = new Set();
    b.merge(a.state()); // capture addition so it can be removed
    b.remove(ameta.id);

    a.merge(b.state());
    assert.isUndefined(a.get(ameta.id));
  });

  it('only tombstone removals for items already in set', () => {
    const a = new Set();
    const adoc = createDoc();
    const ameta = a.add(adoc);

    const b = new Set();
    const removed = b.remove(ameta.id);

    a.merge(b.state());

    assert.isUndefined(removed);
    assert.deepEqual(a.get(ameta.id), ameta);
  });
});
