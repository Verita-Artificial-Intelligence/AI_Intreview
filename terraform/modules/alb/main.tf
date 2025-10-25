# Security group for ALB
resource "aws_security_group" "alb" {
  name        = "${var.app_name}-alb-sg"
  description = "Security group for ALB"
  vpc_id      = var.vpc_id

  # HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # WebSocket support (uses HTTP/HTTPS)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.app_name}-alb-sg"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.app_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.subnets

  enable_deletion_protection = var.environment == "prod"

  tags = {
    Name = "${var.app_name}-alb"
  }
}

# Target group for backend service
resource "aws_lb_target_group" "backend" {
  name        = "${var.app_name}-backend-tg"
  port        = var.backend_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  # WebSocket support: sticky sessions + longer timeouts
  stickiness {
    type            = "lb_cookie"
    enabled         = true
    cookie_duration = 86400 # 24 hours
  }

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health" # Add this health check endpoint to your FastAPI backend
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = {
    Name = "${var.app_name}-backend-tg"
  }
}

# HTTP listener (redirect to HTTPS in production, forward in dev)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = var.environment == "prod" && var.domain_name != "" ? "redirect" : "forward"
    target_group_arn = var.environment == "prod" || var.domain_name != "" ? null : aws_lb_target_group.backend.arn

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ACM Certificate (auto-validated if domain is set)
resource "aws_acm_certificate" "main" {
  count             = var.domain_name != "" ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"
  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.app_name}-cert"
  }
}

# Certificate validation (requires DNS record creation)
resource "aws_acm_certificate_validation" "main" {
  count           = var.domain_name != "" ? 1 : 0
  certificate_arn = aws_acm_certificate.main[0].arn

  timeouts {
    create = "5m"
  }
}

# HTTPS listener with certificate
resource "aws_lb_listener" "https" {
  count             = var.domain_name != "" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  certificate_arn   = aws_acm_certificate.main[0].arn
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  depends_on = [aws_acm_certificate_validation.main]
}

# If no domain, forward HTTP to backend
resource "aws_lb_listener_rule" "backend_http" {
  count            = var.domain_name != "" ? 0 : 1
  listener_arn     = aws_lb_listener.http.arn
  priority         = 100
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}
