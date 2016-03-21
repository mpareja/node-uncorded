'use strict';

const config = require('../config.js');
const createServer = require('../server.js');
const log = require('bunyan').createLogger({ name: 'tests', level: 'warn' });
const supertest = require('supertest');

describe('API', () => {
  let server;

  beforeEach(done => {
    server = createServer(config, log);
    done();
  });

  afterEach(done => {
    server.close();
    done();
  });

  it('is up', done => {
    supertest(server)
      .get('/')
      .expect(200)
      .end(done);
  });
});
