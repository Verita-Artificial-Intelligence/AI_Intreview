output "alb_dns_name" {
  description = "DNS name of the load balancer (where frontend will point)"
  value       = module.alb.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the load balancer"
  value       = module.alb.zone_id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = module.ecs.service_name
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket for video uploads"
  value       = module.s3.bucket_name
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = module.s3.bucket_arn
}

output "documentdb_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = var.enable_documentdb ? module.documentdb[0].cluster_endpoint : null
  sensitive   = true
}

output "documentdb_connection_string" {
  description = "MongoDB connection string for DocumentDB"
  value = var.enable_documentdb ? "mongodb://${var.documentdb_username}:password@${module.documentdb[0].cluster_endpoint}:27017/?tls=true" : null
  sensitive = true
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "backend_url" {
  description = "Backend API URL (configure CORS in backend with this)"
  value       = "https://${module.alb.dns_name}"
}
