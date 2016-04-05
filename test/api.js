'use strict';

const assert = require('chai').assert;
const split = require('split');
const supertest = require('supertest');
const uncorded = require('../');

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

  describe('/sets/{set}', () => {
    describe('a set already containing a value', () => {
      let data, httpStream, splitStream, tokens, foo;

      before(done => {
        tokens = db.createSet('tokens');
        foo = tokens.add({ foo: 'bar' });

        httpStream = supertest(server).get('/sets/tokens');
        splitStream = httpStream.pipe(split(JSON.parse, null, { trailing: false }));

        splitStream.once('data', d => {
          data = d;
          done();
        });
      });

      after(() => {
        httpStream.abort(); // don't leave request hanging
      });

      it('allows retrieval of existing state', () => {
        assert.isObject(data);
        assert.isObject(data.adds);
        assert.isObject(data.removals);
        assert.equal(Object.keys(data.adds).length, 1);
        assert.equal(Object.keys(data.removals).length, 0);

        const found = data.adds[foo.id];
        assert.isObject(found);
        assert.deepEqual(found.doc, { foo: 'bar' });
      });

      it('allows receiving subsequent state changes', done => {
        const bar = tokens.add({ bar: 'baz' });

        splitStream.once('data', data => {
          assert.equal(Object.keys(data.adds).length, 2);
          assert.equal(Object.keys(data.removals).length, 0);

          const found = data.adds[bar.id];
          assert.isObject(found);
          assert.deepEqual(found.doc, { bar: 'baz' });
          done();
        });
      });

      describe('when a second listener joins', () => {
        it('existing state is sent immediately', done => {
          const http = supertest(server).get('/sets/tokens');
          const stream = http.pipe(split(JSON.parse, null, { trailing: false }));

          stream.once('data', data => {
            http.abort(); // don't leave request hanging

            assert.equal(Object.keys(data.adds).length, 2);
            assert.equal(Object.keys(data.removals).length, 0);
            done();
          });
        });

        it('existing state is only sent once', done => {
          tokens.add({ ping: 'pong' });

          const http = supertest(server).get('/sets/tokens');
          const stream = http.pipe(split(JSON.parse, null, { trailing: false }));

          const states = [];
          stream.on('data', states.push.bind(states));
          stream.on('end', () => {
            assert.equal(states.length, 1);
            done();
          });

          // indicate set-stream is done producing events
          // (ping-pong above is already pushed on buffer)
          tokens.push(null);
        });
      });
    });

    describe('a set already containing multiple values', () => {
      it('only sends existing state once', done => {
        const things = db.createSet('things');
        things.add({ ping: 'pong' });
        things.add({ lat: 'long' });

        const http = supertest(server).get('/sets/things');
        const stream = http.pipe(split(JSON.parse, null, { trailing: false }));

        const states = [];
        stream.on('data', states.push.bind(states));
        stream.on('end', () => {
          assert.equal(states.length, 1);
          done();
        });

        // indicate set-stream is done producing events
        // (ping-pong above is already pushed on buffer)
        things.push(null);
      });
    });
  });
});
