output "cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  value = aws_ecs_cluster.main.arn
}

output "service_name" {
  value = aws_ecs_service.backend.name
}

output "service_id" {
  value = aws_ecs_service.backend.id
}

output "task_definition_arn" {
  value = aws_ecs_task_definition.backend.arn
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.ecs.name
}

output "security_group_id" {
  description = "Security group ID for ECS tasks"
  value       = aws_security_group.ecs.id
}
