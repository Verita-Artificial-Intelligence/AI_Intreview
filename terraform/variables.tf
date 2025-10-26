variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "verita-ai-interview"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "container_port" {
  description = "Port the FastAPI backend runs on"
  type        = number
  default     = 8000
}

variable "container_cpu" {
  description = "CPU units for ECS task (256 = 0.25 vCPU)"
  type        = number
  default     = 512
}

variable "container_memory" {
  description = "Memory in MB for ECS task"
  type        = number
  default     = 1024
}

variable "desired_task_count" {
  description = "Number of ECS tasks to run"
  type        = number
  default     = 2
}

variable "min_task_count" {
  description = "Minimum number of tasks for autoscaling"
  type        = number
  default     = 2
}

variable "max_task_count" {
  description = "Maximum number of tasks for autoscaling"
  type        = number
  default     = 6
}

variable "container_image" {
  description = "Docker image URI for backend (e.g., 123456789.dkr.ecr.us-east-1.amazonaws.com/verita-backend:latest)"
  type        = string
}

variable "openai_api_key" {
  description = "OpenAI API key for Realtime API"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
}

variable "documentdb_username" {
  description = "DocumentDB master username"
  type        = string
  default     = "admin"
}

variable "documentdb_password" {
  description = "DocumentDB master password"
  type        = string
  sensitive   = true
}

variable "documentdb_engine_version" {
  description = "DocumentDB engine version"
  type        = string
  default     = "5.0.0"
}

variable "enable_documentdb" {
  description = "Whether to create DocumentDB cluster"
  type        = bool
  default     = true
}

variable "s3_upload_bucket_name" {
  description = "S3 bucket name for video uploads (leave empty to auto-generate)"
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Domain name for HTTPS (e.g., api.yourdomain.com). Leave empty for HTTP-only"
  type        = string
  default     = ""
}

variable "alert_email" {
  description = "Email address to receive CloudWatch alarm notifications"
  type        = string
}

variable "mongodb_uri" {
  description = "MongoDB connection string (only used if enable_documentdb=false)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

variable "github_repository_url" {
  description = "GitHub repository URL (e.g., https://github.com/username/repo)"
  type        = string
}
