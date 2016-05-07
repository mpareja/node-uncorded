const aws = require('aws-sdk');

module.exports = listElbHealthInstances;

function listElbHealthInstances(region, name, callback, ElbOverride, Ec2Override) {
  const ELB = ElbOverride || /* istanbul ignore next */ aws.ELB;
  const EC2 = Ec2Override || /* istanbul ignore next */ aws.EC2;
  const elb = new ELB({ region: region });
  const ec2 = new EC2({ region: region });
  elb.describeInstanceHealth({
    LoadBalancerName: name
  }, (err, data) => {
    if (err) { return callback(err); }

    const ids = data.InstanceStates
      .filter(s => s.State === 'InService')
      .map(s => s.InstanceId);

    ec2.describeInstances({ InstanceIds: ids }, (err, results) => {
      if (err) { return callback(err); }

      const ips = results.Reservations
        .map(r => r.Instances.map(i => i.PrivateIpAddress))
        .reduce((a, b) => a.concat(b), []);
      callback(null, ips);
    });
  });
}

