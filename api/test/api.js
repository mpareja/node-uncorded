'use strict';

const supertest = require('supertest');
const uncorded = require('../../');

describe('API', () => {
  let db, server;

  beforeEach(done => {
    db = uncorded.createServer();
    server = db._server;
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
