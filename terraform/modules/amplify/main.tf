resource "aws_amplify_app" "frontend" {
  name       = var.app_name
  repository = var.repository_url

  # Build settings for React app
  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - cd ${var.build_path}
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: ${var.build_path}/build
        files:
          - '**/*'
      cache:
        paths:
          - ${var.build_path}/node_modules/**/*
  EOT

  # Environment variables
  environment_variables = var.environment_variables

  # Enable auto branch creation for preview deployments
  enable_auto_branch_creation = true
  enable_branch_auto_build    = true
  enable_branch_auto_deletion = true

  # IAM service role for Amplify
  iam_service_role_arn = var.iam_service_role_arn

  # Custom rules for SPA routing
  custom_rule {
    source = "/<*>"
    status = "404"
    target = "/index.html"
  }

  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>"
    status = "200"
    target = "/index.html"
  }

  tags = {
    Name        = var.app_name
    Environment = var.environment
  }
}

# Main/Production branch
resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = "main"
  stage       = "PRODUCTION"

  enable_auto_build = true

  environment_variables = merge(
    var.environment_variables,
    var.production_environment_variables
  )

  tags = {
    Name        = "${var.app_name}-main"
    Environment = "production"
  }
}

# Development/Staging branch
resource "aws_amplify_branch" "development" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = "development"
  stage       = "DEVELOPMENT"

  enable_auto_build = true

  environment_variables = merge(
    var.environment_variables,
    var.development_environment_variables
  )

  tags = {
    Name        = "${var.app_name}-development"
    Environment = "development"
  }
}

# Custom domain for production
resource "aws_amplify_domain_association" "main" {
  count = var.production_domain != "" ? 1 : 0

  app_id      = aws_amplify_app.frontend.id
  domain_name = var.production_domain

  # Main branch gets the root domain
  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = ""
  }

  # Development branch gets the staging subdomain
  sub_domain {
    branch_name = aws_amplify_branch.development.branch_name
    prefix      = var.staging_subdomain_prefix
  }

  wait_for_verification = false
}
