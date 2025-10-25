variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "cidr_block" {
  type = string
}

variable "container_port" {
  type    = number
  default = 8000
}
