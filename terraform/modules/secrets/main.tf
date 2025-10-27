# AWS Secrets Manager for sensitive configuration
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${var.app_name}-${var.environment}-secrets"
  description             = "Application secrets for ${var.app_name}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "${var.app_name}-secrets"
  }
}

# Store the secret value
resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    openai_api_key             = var.openai_api_key
    jwt_secret                 = var.jwt_secret
    documentdb_password        = var.documentdb_password
    clerk_candidate_secret_key = var.clerk_candidate_secret_key
    clerk_admin_secret_key     = var.clerk_admin_secret_key
    ses_access_key_id          = var.ses_access_key_id
    ses_secret_access_key      = var.ses_secret_access_key
    ses_from_address           = var.ses_from_address
    company_name               = var.company_name
    company_logo_url           = var.company_logo_url
    support_email              = var.support_email
  })
}

# IAM policy to allow ECS tasks to read secrets
resource "aws_iam_role_policy" "ecs_secrets_policy" {
  name = "${var.app_name}-ecs-secrets-policy"
  role = var.ecs_task_role_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.app_secrets.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = ["*"]
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${var.aws_region}.amazonaws.com"
          }
        }
      }
    ]
  })
}
