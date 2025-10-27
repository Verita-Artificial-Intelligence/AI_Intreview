variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "ecs_task_role_id" {
  description = "ECS task role ID to grant Secrets Manager access"
  type        = string
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
}

variable "documentdb_password" {
  description = "DocumentDB master password"
  type        = string
  sensitive   = true
}

variable "clerk_candidate_secret_key" {
  description = "Clerk secret key for candidate authentication"
  type        = string
  sensitive   = true
}

variable "clerk_admin_secret_key" {
  description = "Clerk secret key for admin authentication"
  type        = string
  sensitive   = true
}
