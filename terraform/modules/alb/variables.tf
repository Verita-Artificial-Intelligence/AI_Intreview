variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnets" {
  type = list(string)
}

variable "backend_port" {
  type    = number
  default = 8000
}

variable "enable_websocket" {
  description = "Enable WebSocket support (sticky sessions)"
  type        = bool
  default     = true
}

variable "domain_name" {
  description = "Domain name for HTTPS certificate (leave empty for HTTP-only). Format: api.yourdomain.com"
  type        = string
  default     = ""
}
