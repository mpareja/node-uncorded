'use strict';
const assert = require('chai').assert;
const sinon = require('sinon');
const startClusterDiscovery = require('../lib/cluster-discovery-elb');

describe('cluster-discovery-elb', () => {
  describe('successfully initializing cluster discovery', () => {
    let clusterDiscovery, scheduleStub, listStub;
    beforeEach(() => {
      listStub = sinon.stub().yieldsAsync(null, [ '10.1.1.1', '10.2.2.2' ]);
      scheduleStub = sinon.stub();
      const options = {
        region: 'us-east-1',
        elbName: 'bogus-test-elb',
        listElbHealthInstances: listStub,
        schedule: scheduleStub
      };
      clusterDiscovery = startClusterDiscovery(options);
    });

    it('fetches healthy IP addresses', () => {
      sinon.assert.calledWith(listStub, 'us-east-1', 'bogus-test-elb', sinon.match.func);
    });

    it('publishes peer-added messages for each healthy IP', done => {
      clusterDiscovery.once('peer-added', peer => {
        assert.equal(peer, '10.1.1.1');
        clusterDiscovery.once('peer-added', peer => {
          assert.equal(peer, '10.2.2.2');
          done();
        });
      });
    });

    it('enables polling of ELB for healthy instances after publishing changes', done => {
      sinon.assert.notCalled(scheduleStub);
      clusterDiscovery.once('peer-added', () => {
        sinon.assert.notCalled(scheduleStub);
        clusterDiscovery.once('peer-added', () => {
          sinon.assert.notCalled(scheduleStub);

          // expect schedule to be called after all peer-added handlers have completed
          setImmediate(() => {
            sinon.assert.calledOnce(scheduleStub);
            sinon.assert.calledWith(scheduleStub, sinon.match.func);
            done();
          });
        });
      });
    });

    it('does not publish peer-removed for healthy IPs', done => {
      clusterDiscovery.on('peer-removed', () => {
        done(new Error('should not call peer-removed'));
      });

      clusterDiscovery.once('peer-added', () => {
        clusterDiscovery.once('peer-added', () => {
          done();
        });
      });
    });

    describe('removing an instance from the cluster ELB', () => {
      // HERE: going to invoke the discover function (emulating timeout complete)
      // and setup listStub to return one less IP address
      it('publishes peer-removed messages', done => {
        // we will invoke the discover function to pretend that
        // the scheduler decided it was time to trigger
        // the next round of polling
        const discover = scheduleStub.getCall(0).args[0];

        // stub the next call for healthy IPs to only return one
        listStub.yieldsAsync(null, [ '10.2.2.2' ]);
        clusterDiscovery.once('peer-removed', peer => {
          assert.equal(peer, '10.1.1.1');

          // stub the next call for healthy IPs to only return one
          listStub.yieldsAsync(null, []);
          clusterDiscovery.once('peer-removed', peer => {
            assert.equal(peer, '10.2.2.2');
            done();
          });

          discover();
        });

        setImmediate(discover);
      });
    });
  });

  describe('unsuccessfully initializing cluster discovery', () => {
    let clusterDiscovery, scheduleStub, listStub;
    beforeEach(() => {
      listStub = sinon.stub().yieldsAsync(new Error('bogus'));
      scheduleStub = sinon.stub();
      const options = {
        region: 'us-east-1',
        elbName: 'bogus-test-elb',
        listElbHealthInstances: listStub,
        schedule: scheduleStub
      };
      clusterDiscovery = startClusterDiscovery(options);
    });

    it('reports inability to query ELB for healthy instances', done => {
      clusterDiscovery.on('error', err => {
        assert.instanceOf(err, Error);
        assert.equal(err.message, 'bogus');
        assert.equal(err.region, 'us-east-1');
        assert.equal(err.elbName, 'bogus-test-elb');
        done();
      });
    });

    it('schedules the next attempt', done => {
      clusterDiscovery.on('error', () => {
        setImmediate(() => {
          sinon.assert.calledOnce(scheduleStub);
          sinon.assert.calledWith(scheduleStub, sinon.match.func);
          done();
        });
      });
    });
  });
});
