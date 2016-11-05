provider "aws" {
  access_key = "${var.aws_access_key}"
  secret_key = "${var.aws_secret_key}"
  region = "us-east-1"
}

output "private_elb_dns_name" {
  value = "${aws_elb.elb.dns_name}"
}

resource "aws_elb" "elb" {
  name = "uncorded-elb"
  availability_zones = ["us-east-1c"]

  connection_draining = true
  connection_draining_timeout = 30

  listener {
    lb_port = 80
    lb_protocol = "http"
    instance_port = 8199
    instance_protocol = "http"
  }

  health_check {
    healthy_threshold = 2
    unhealthy_threshold = 5
    target = "HTTP:8199/"
    interval = 30
    timeout = 5
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_launch_configuration" "server-lc" {
  # Amazon Linux AMI 2016.03.0 (HVM), SSD Volume Type
  image_id = "ami-08111162"
  instance_type = "t2.micro"
  key_name = "uncorded-key"
  security_groups = ["${aws_security_group.sg.id}"]
  iam_instance_profile = "uncorded-instance-profile"
  user_data = "${file("user_data")}"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "server-asg" {
  name = "uncorded-asg"
  launch_configuration = "${aws_launch_configuration.server-lc.name}"

  availability_zones = ["us-east-1c"]
  load_balancers = ["${aws_elb.elb.id}"]
  max_size = 2
  min_size = 1
  desired_capacity = 2

  termination_policies = ["OldestInstance", "Default"]

  health_check_type = "EC2"
  health_check_grace_period = "600"

  tag {
    key = "Name"
    value = "uncorded"
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_key_pair" "key" {
  key_name = "uncorded-key"
  public_key = "${file("id_rsa.pub")}"
}

resource "aws_security_group" "sg" {
  name = "uncorded-sg"
  description = "Allow all inbound traffic"

  ingress {
      from_port = 0
      to_port = 0
      protocol = "-1"
      cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
      from_port = 0
      to_port = 0
      protocol = "-1"
      cidr_blocks = ["0.0.0.0/0"]
  }
}
