variable "app_name" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "alb_arn" {
  description = "ARN of the Application Load Balancer"
  type        = string
}
