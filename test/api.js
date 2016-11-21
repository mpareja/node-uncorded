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
          data = d.tokens;
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
          assert.equal(Object.keys(data.tokens.adds).length, 2);
          assert.equal(Object.keys(data.tokens.removals).length, 0);

          const found = data.tokens.adds[bar.id];
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

            assert.equal(Object.keys(data.tokens.adds).length, 2);
            assert.equal(Object.keys(data.tokens.removals).length, 0);
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

  describe('/sets/{a,b,...}', () => {
    describe('given a server with multiple sets', () => {
      let a, b, c;

      before(() => {
        a = db.createSet('a');
        b = db.createExpiringSet('b', { ttl: 15000 });
        c = db.createSet('c');
        a.add({ a1: 'a1' });
        b.add({ b1: 'b1' });
        c.add({ c1: 'c1' });
      });

      it('allows retrieval of existing states', done => {
        const httpStream = supertest(server).get('/sets/a,b');
        const splitStream = httpStream.pipe(split(JSON.parse, null, { trailing: false }));

        splitStream.once('data', data => {
          httpStream.abort(); // don't leave request hanging

          assert.isObject(data.a);
          assert.isObject(data.b);
          done();
        });
      });

      it('allows receiving subsequent state changes to multiple sets', done => {
        const httpStream = supertest(server).get('/sets/a,b');
        const splitStream = httpStream.pipe(split(JSON.parse, null, { trailing: false }));

        splitStream.once('data', () => {
          const a2 = a.add({ a2: 'a2' });
          splitStream.once('data', data => {
            assert.deepEqual(data.a.adds[a2.id], a2);

            const b2 = b.add({ b2: 'b2' });
            splitStream.once('data', data => {
              httpStream.abort(); // don't leave request hanging

              assert.deepEqual(data.b.adds[b2.id], b2);
              done();
            });
          });
        });
      });

      it('does not send existing state for unrequested sets', done => {
        const httpStream = supertest(server).get('/sets/a,b');
        const splitStream = httpStream.pipe(split(JSON.parse, null, { trailing: false }));

        splitStream.once('data', data => {
          httpStream.abort(); // don't leave request hanging

          assert.isUndefined(data.c);
          done();
        });
      });

      it('does not send subseuent state changes for unrequested sets', done => {
        const httpStream = supertest(server).get('/sets/a,b');
        const splitStream = httpStream.pipe(split(JSON.parse, null, { trailing: false }));

        splitStream.once('data', () => {
          // make a change to `a` in addition to `c`
          // so we can monitor `data` events and know that
          // `c` failed to elicit a change without having to
          // wait for some timeout period
          c.add({ c2: 'c2' });
          a.add({ a3: 'a3' });
          splitStream.once('data', data => {
            httpStream.abort(); // don't leave request hanging

            assert.isUndefined(data.c);
            done();
          });
        });
      });

      // Until we resolve https://github.com/mpareja/node-uncorded/issues/10,
      // ignoring missing sets is safest so long as all uncorded nodes in cluster
      // call `createSet` on the same tick as `createServer`. If a new node requires
      // a new set but connects to an old node, the new node won't receive old node updates
      // for the new set - that's okay since the old node doesn't know about the new set
      // anyway. Later, when the old node is upgraded, the new node's replication
      // connection with the upgraded node will break and a reconnect is expected. On
      // reconnect, the upgraded node should have the new set and everything should
      // work out.
      it('ignores requests for missing sets', done => {
        const httpStream = supertest(server).get('/sets/a,b,unknown');
        const splitStream = httpStream.pipe(split(JSON.parse, null, { trailing: false }));

        splitStream.once('data', data => {
          httpStream.abort(); // don't leave request hanging

          assert.isUndefined(data.unknown);
          done();
        });
      });
    });
  });
});
