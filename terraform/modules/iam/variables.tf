variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "s3_bucket_arn" {
  type = string
}

variable "enable_secrets_access" {
  description = "Enable Secrets Manager access for ECS tasks"
  type        = bool
  default     = false
}
