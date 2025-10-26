output "ecs_task_execution_role_arn" {
  value = aws_iam_role.ecs_task_execution_role.arn
}

output "ecs_task_role_arn" {
  value = aws_iam_role.ecs_task_role.arn
}

output "ecs_task_role_id" {
  value = aws_iam_role.ecs_task_role.id
}

output "amplify_role_arn" {
  value = aws_iam_role.amplify_role.arn
}
