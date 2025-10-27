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

# AWS SES Email Configuration
variable "ses_access_key_id" {
  description = "AWS SES access key ID"
  type        = string
  sensitive   = true
}

variable "ses_secret_access_key" {
  description = "AWS SES secret access key"
  type        = string
  sensitive   = true
}

variable "ses_from_address" {
  description = "Email address to send from (must be verified in SES)"
  type        = string
}

# Email Branding
variable "company_name" {
  description = "Company name for email branding"
  type        = string
  default     = "Verita"
}

variable "company_logo_url" {
  description = "URL to company logo for emails"
  type        = string
  default     = ""
}

variable "support_email" {
  description = "Support email address for emails"
  type        = string
  default     = "support@verita.ai"
}
