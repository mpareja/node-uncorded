'use strict';

const assert = require('chai').assert;
const split = require('split');
const supertest = require('supertest');
const uncorded = require('../../');

describe('API', () => {
  let db, server;

  before(done => {
    db = uncorded.createServer();
    server = db._server;
    done();
  });

  after(done => {
    server.close();
    done();
  });

  it('is up', done => {
    supertest(server)
      .get('/')
      .expect(200)
      .end(done);
  });

  it('supports retrieving the current state', done => {
    const tokens = db.createSet('tokens');
    const foo = tokens.add({ foo: 'bar' });

    const httpStream = supertest(server).get('/sets/tokens');
    const splitStream = split(raw => {
      const data = JSON.parse(raw);
      assert.isObject(data);
      assert.isObject(data);

      assert.isObject(data);
      assert.isObject(data.adds);
      assert.isObject(data.removals);
      assert.equal(Object.keys(data.adds).length, 1);
      assert.equal(Object.keys(data.removals).length, 0);

      const found = data.adds[foo.id];
      assert.isObject(found);
      assert.deepEqual(found.doc, { foo: 'bar' });

      httpStream.abort(); // don't leave request hanging
    }, null, { trailing: false });

    httpStream
      .pipe(splitStream)
      .on('end', done);
  });
});
