variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "db_subnet_ids" {
  type = list(string)
}

variable "security_group_id" {
  description = "Security group ID for DocumentDB cluster"
  type        = string
}

variable "master_username" {
  type = string
}

variable "master_password" {
  type      = string
  sensitive = true
}

variable "engine_version" {
  type    = string
  default = "5.0.0"
}

variable "cluster_size" {
  type    = number
  default = 2
}

variable "instance_class" {
  type    = string
  default = "db.t3.medium"
}

variable "skip_final_snapshot" {
  type    = bool
  default = false
}
