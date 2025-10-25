variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "alert_email" {
  description = "Email address to receive alerts"
  type        = string
}

variable "ecs_cluster_name" {
  type = string
}

variable "ecs_service_name" {
  type = string
}

variable "max_task_count" {
  type = number
}

variable "alb_name" {
  description = "Name of the Application Load Balancer"
  type        = string
}

variable "target_group_name" {
  description = "Name of the ALB target group"
  type        = string
}

variable "documentdb_cluster_id" {
  type = string
}
