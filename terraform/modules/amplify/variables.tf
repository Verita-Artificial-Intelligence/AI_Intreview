variable "app_name" {
  description = "Name of the Amplify app"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "repository_url" {
  description = "GitHub repository URL"
  type        = string
}

variable "build_path" {
  description = "Path to the frontend directory in the repo"
  type        = string
}

variable "production_domain" {
  description = "Production domain name (e.g., interview.verita-ai.com)"
  type        = string
  default     = ""
}

variable "staging_subdomain_prefix" {
  description = "Subdomain prefix for staging (e.g., 'staging' for staging.interview.verita-ai.com)"
  type        = string
  default     = "staging"
}

variable "iam_service_role_arn" {
  description = "IAM service role ARN for Amplify"
  type        = string
}

variable "environment_variables" {
  description = "Environment variables for all branches"
  type        = map(string)
  default     = {}
}

variable "production_environment_variables" {
  description = "Environment variables specific to production branch"
  type        = map(string)
  default     = {}
}

variable "development_environment_variables" {
  description = "Environment variables specific to development branch"
  type        = map(string)
  default     = {}
}
