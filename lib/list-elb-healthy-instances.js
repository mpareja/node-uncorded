'use strict';
const async = require('async');
const aws = require('aws-sdk');
const request = require('request');

module.exports = listElbHealthyInstances;

let instanceId = null;
function getInstanceId(cb) {
  if (instanceId) { return cb(null, instanceId); }

  request('http://169.254.169.254/latest/meta-data/instance-id', (err, res, body) => {
    if (err) {
      return cb(err);
    }
    instanceId = body;
    cb(null, body);
  });
}

function listElbHealthyInstances(region, name, callback, ElbOverride, Ec2Override) {
  const ELB = ElbOverride || /* istanbul ignore next */ aws.ELB;
  const EC2 = Ec2Override || /* istanbul ignore next */ aws.EC2;
  const elb = new ELB({ region: region });
  const ec2 = new EC2({ region: region });

  async.parallel({
    localId: getInstanceId,
    data: elb.describeInstanceHealth.bind(elb, { LoadBalancerName: name })
  }, (err, results) => {
    if (err) { return callback(err); }

    const ids = results.data.InstanceStates
      .filter(s => s.State === 'InService' && s.InstanceId !== results.localId)
      .map(s => s.InstanceId);

    if (!ids.length) {
      return callback(null, []);
    }

    ec2.describeInstances({ InstanceIds: ids }, (err, results) => {
      if (err) { return callback(err); }

      const ips = results.Reservations
        .map(r => r.Instances.map(i => i.PrivateIpAddress))
        .reduce((a, b) => a.concat(b), []);
      callback(null, ips);
    });
  });
}


