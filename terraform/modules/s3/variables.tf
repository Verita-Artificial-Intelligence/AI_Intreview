variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "bucket_name" {
  description = "Custom bucket name (leave empty to auto-generate)"
  type        = string
  default     = ""
}

variable "enable_versioning" {
  type    = bool
  default = true
}

variable "enable_lifecycle_rules" {
  description = "Enable automatic deletion of old uploads"
  type        = bool
  default     = false
}

variable "object_expiration_days" {
  description = "Days before uploaded objects expire"
  type        = number
  default     = 90
}
