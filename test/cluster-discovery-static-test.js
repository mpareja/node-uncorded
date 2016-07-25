'use strict';
const assert = require('chai').assert;
const startClusterDiscovery = require('../lib/cluster-discovery-static');
const uncorded = require('..');

describe('cluster-discovery-static', () => {
  it('successfully publishes each static address', done => {
    const clusterDiscovery = startClusterDiscovery([ 'http://10.1.1.1:8199', 'http://10.2.2.2:8200' ]);
    clusterDiscovery.once('peer-added', peer => {
      assert.equal(peer, 'http://10.1.1.1:8199');
      clusterDiscovery.once('peer-added', peer => {
        assert.equal(peer, 'http://10.2.2.2:8200');

        clusterDiscovery.once('peer-added', () => {
          done(new Error('no more peers should be published'));
        });
        done();
      });
    });
  });

  it('uncorded exports static cluster discovery module', () => {
    assert.equal(uncorded.discovery.static, startClusterDiscovery);
  });
});
