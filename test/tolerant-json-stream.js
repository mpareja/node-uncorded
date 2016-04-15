'use strict';
const assert = require('chai').assert;
const config = require('../api/config.js');
const http = require('http');
const createRetryJsonStream = require('../lib/tolerant-json-stream.js');

describe('tolerant-json-stream', () => {

  describe('when connected to another node', () => {
    let response, server, stream;
    const url = `http://localhost:${config.port}/sets/a,b`;


    beforeEach(done => {
      server = http.createServer();
      server.once('request', (req, res) => {
        response = res;
        done();
      });
      server.listen(config.port, () => {
        stream = createRetryJsonStream(url);
      });
    });

    afterEach(done => {
      stream.stop();
      server.close(done); // waits until retry json has dropped connection
    });

    it('emits connect event', done => {
      response.flushHeaders();
      stream.once('connect', () => done());
    });

    it('emits initial object received from the stream', done => {
      response.write(JSON.stringify({ a: 1 }) + '\r\n');
      stream.once('data', data => {
        assert.equal(data.a, 1);
        done();
      });
    });

    it('emits subsequent objects received from the stream', done => {
      response.write(JSON.stringify({ a: 1 }) + '\r\n');
      stream.once('data', () => {
        response.write(JSON.stringify({ a: 2 }) + '\r\n');
        stream.once('data', data => {
          assert.equal(data.a, 2);
          done();
        });
      });
    });

    describe('when the server ends the current request', () => {
      it('reconnects and receives new data', done => {
        testReconnect(() => response.end(), done);
      });

      it('emits connectionError event', done => {
        response.end();
        stream.once('connectionError', err => {
          assert.instanceOf(err, Error);
          assert.equal(err.message, 'server ended request');
          done();
        });
      });
    });

    describe('when the server destroys the current request', () => {
      it('reconnects and receives new data', done => {
        testReconnect(() => response.destroy(), done);
      });

      it('emits connectionError event', done => {
        response.end();
        stream.once('connectionError', err => {
          assert.instanceOf(err, Error);
          assert.equal(err.message, 'server ended request');
          done();
        });
      });
    });

    describe('when the server dies', () => {
      it('emits connectionError event', done => {
        response.end();
        server.close();
        server.close = (cb) => cb(); // stub so beforeEach doesn't break

        stream.once('connectionError', err => {
          assert.instanceOf(err, Error);
          assert.equal(err.message, 'server ended request');
          done();
        });
      });

      it('emits connectionError for subsequent reconnection failure', done => {
        response.end();
        server.close();
        server.close = (cb) => cb(); // stub so beforeEach doesn't break

        stream.once('connectionError', () => {
          stream.once('connectionError', err => {
            assert.instanceOf(err, Error);
            assert.match(err.message, /ECONNREFUSED/);
            done();
          });
        });
      });

      it('reconnection attempts back off');
    });

    describe('when the server is slow to respond', () => {
      it('should timeout request and try again');
      it('should backoff on retries on timeouts');
    });

    function testReconnect(terminate, done) {
      response.write(JSON.stringify({ a: 1 }) + '\r\n');
      stream.once('data', () => {
        let connected = false;

        // terminate the initial request to kick things off
        terminate();

        // wait for next request to server
        server.once('request', (req, secondResponse) => {
          secondResponse.write(JSON.stringify({ a: 2 }) + '\r\n');
        });

        stream.once('connect', () => connected = true);

        // assert state is emitted
        stream.once('data', data => {
          assert.isTrue(connected);
          assert.equal(data.a, 2);
          done();
        });
      });
    }
  });

  describe('error handling', () => {
    it('expects a node url', () => {
      assert.throws(() => {
        createRetryJsonStream(null, ['a','b']);
      }, 'url is required');
    });

    it('handles bad json data');
  });
});
