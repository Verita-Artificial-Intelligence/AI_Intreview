output "secret_arn" {
  description = "ARN of the secrets in Secrets Manager"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

output "secret_name" {
  description = "Name of the secret"
  value       = aws_secretsmanager_secret.app_secrets.name
}
