'use strict';
const assert = require('chai').assert;
const describeInstanceHealth = require('../lib/list-elb-healthy-instances');
const nock = require('nock');
const sinon = require('sinon');

describe('list-elb-healthy-instances', () => {
  let err, peers, stubDescribeInstanceHealth, stubDescribeInstances, StubElb, StubEc2;

  // it is important that this test be first to prove that memoization
  // does not happen for a failed request to get local IP address
  describe('error retrieving local instance id', () => {
    beforeEach(done => {
      nock('http://169.254.169.254')
        .get('/latest/meta-data/instance-id')
        .replyWithError(new Error('bogus transport error'));
      stubDescribeInstanceHealth = sinon.stub().yieldsAsync(null, getElbResponse());
      stubDescribeInstances = sinon.stub().yieldsAsync(new Error('Bogus2'));
      go(done);
    });

    it('returns the error', () => {
      assert.instanceOf(err, Error);
      assert.equal(err.message, 'bogus transport error');
    });
  });

  describe('successfully retrieving a list of healthy instances', () => {
    beforeEach(done => {
      stubGettingLocalInstanceId();
      stubDescribeInstanceHealth = sinon.stub().yieldsAsync(null, getElbResponse());
      stubDescribeInstances = sinon.stub().yieldsAsync(null, getEc2Response());
      go(done);
    });

    it('returns no error', () => assert.isNull(err));

    it('returns InService instance IP addresses', () => {
      assert.deepEqual(peers, [ '10.0.0.1' ]);
    });

    it('initializes the aws region correctly', () => {
      sinon.assert.calledWith(StubElb, { region: 'us-east-1' });
      sinon.assert.calledWith(StubEc2, { region: 'us-east-1' });
    });

    it('excludes local instance, unhealthy instances and unknown instances', () => {
      const expected = { InstanceIds: [ 'i-b1b1b1b1' ] };
      sinon.assert.calledWith(stubDescribeInstances, expected);
    });
  });

  describe('successfully retrieves no healthy IP addresses', () => {
    beforeEach(done => {
      stubGettingLocalInstanceId();
      const response = getElbResponse();
      response.InstanceStates[1].State = 'OutOfService';
      stubDescribeInstanceHealth = sinon.stub().yieldsAsync(null, response);
      stubDescribeInstances = sinon.stub().yieldsAsync(null, getEc2Response());
      go(done);
    });

    it('returns no error', () => assert.isNull(err));

    it('returns no InService instance IP addresses', () => {
      assert.deepEqual(peers, []);
    });

    it('does not spend time trying to describe any instances', () => {
      sinon.assert.notCalled(stubDescribeInstances);
    });
  });

  describe('unsuccessfully retrieving a list of instances from elb', () => {
    beforeEach(done => {
      stubGettingLocalInstanceId();
      stubDescribeInstanceHealth = sinon.stub().yieldsAsync(new Error('Bogus'));
      stubDescribeInstances = sinon.spy();
      go(done);
    });

    it('returns the error', () => {
      assert.instanceOf(err, Error);
      assert.equal(err.message, 'Bogus');
    });
  });

  describe('unsuccessfully retrieving IP addresses for instances', () => {
    beforeEach(done => {
      stubGettingLocalInstanceId();
      stubDescribeInstanceHealth = sinon.stub().yieldsAsync(null, getElbResponse());
      stubDescribeInstances = sinon.stub().yieldsAsync(new Error('Bogus2'));
      go(done);
    });

    it('returns the error', () => {
      assert.instanceOf(err, Error);
      assert.equal(err.message, 'Bogus2');
    });
  });

  function stubGettingLocalInstanceId() {
    nock('http://169.254.169.254')
      .get('/latest/meta-data/instance-id')
      .reply(200, 'i-LOCAL');
  }

  function go(done) {
    StubElb = sinon.stub().returns({
      describeInstanceHealth: stubDescribeInstanceHealth
    });
    StubEc2 = sinon.stub().returns({
      describeInstances: stubDescribeInstances
    });
    describeInstanceHealth('us-east-1', 'bogus-test-elb', (e, p) => {
      err = e;
      peers = p;
      done();
    }, StubElb, StubEc2);
  }
});

function getElbResponse() {
  return {
    ResponseMetadata: { RequestId: 'ec90126e-111c-11e6-bf49-2fc4b6f55c25' },
    InstanceStates: [
      { InstanceId: 'i-a1a1a1a1',
        State: 'OutOfService',
        ReasonCode: 'Instance',
        Description: 'Instance has failed at least the UnhealthyThreshold number of health checks consecutively.' },
      { InstanceId: 'i-b1b1b1b1',
        State: 'InService',
        ReasonCode: 'Instance',
        Description: 'Instance has failed at least the UnhealthyThreshold number of health checks consecutively.' },
      { InstanceId: 'i-LOCAL',
        State: 'InService',
        ReasonCode: 'Instance',
        Description: 'Instance has failed at least the UnhealthyThreshold number of health checks consecutively.' },
      { InstanceId: 'i-c1c1c1c1',
        State: 'Unknown',
        ReasonCode: 'Instance',
        Description: 'Instance has failed at least the UnhealthyThreshold number of health checks consecutively.' } ]
  };
}

function getEc2Response() {
  return { 
    Reservations: [
      {
        Instances: [
          { PrivateIpAddress: '10.0.0.1' }
        ]
      }
    ]
  };
}
