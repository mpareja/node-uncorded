'use strict';

const assert = require('chai').assert;
const serialize = require('../lib/bunyan-err-serializer');

describe('serializer', function () {
  const e = new Error('outer');
  e.domain = {};
  e.domainEmitter = {};
  e.domainBound = {};
  e.domainThrown = {};
  e.inner = new Error('inner');
  e.inner.domain = {};
  e.inner.domainEmitter = {};
  e.inner.domainBound = {};

  const result = serialize(e);

  it('is not null', function () {
    assert.isObject(result);
  });

  it('includes message', function () {
    assert.equal(result.message, 'outer');
  });

  it('includes stack', function () {
    assert.ok(result.inner.stack);
  });

  it('does not include domain fields', function () {
    assert.isUndefined(result.inner.domain);
    assert.isUndefined(result.inner.domainEmitter);
    assert.isUndefined(result.inner.domainBound);
  });

  it('includes inner.message', function () {
    assert.equal(result.inner.message, 'inner');
  });

  it('includes inner.stack', function () {
    assert.ok(result.inner.stack);
  });

  it('does not include inner domain fields', function () {
    assert.isUndefined(result.inner.domain);
    assert.isUndefined(result.inner.domainEmitter);
    assert.isUndefined(result.inner.domainBound);
  });
});
