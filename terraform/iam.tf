resource "aws_iam_instance_profile" "uncorded-instance-profile" {
  name = "uncorded-instance-profile"
  roles = ["${aws_iam_role.uncorded-role.name}"]
}

resource "aws_iam_role_policy" "uncorded-policy" {
  name = "uncorded-policy"
  role = "${aws_iam_role.uncorded-role.id}"
  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "elasticloadbalancing:DescribeInstanceHealth*",
        "ec2:DescribeInstances"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_iam_role" "uncorded-role" {
  name = "uncorded-role"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

