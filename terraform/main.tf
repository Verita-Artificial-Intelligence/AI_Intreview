
# VPC and Networking
module "vpc" {
  source = "./modules/vpc"

  app_name    = var.app_name
  environment = var.environment
  cidr_block  = var.vpc_cidr
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"

  app_name    = var.app_name
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnets     = module.vpc.public_subnet_ids

  # Allow WebSocket traffic
  enable_websocket = true

  # HTTPS configuration
  domain_name = var.domain_name
}

# S3 for video uploads
module "s3" {
  source = "./modules/s3"

  app_name          = var.app_name
  environment       = var.environment
  bucket_name       = var.s3_upload_bucket_name
  enable_versioning = var.environment != "dev"
}

# IAM Roles and Policies
module "iam" {
  source = "./modules/iam"

  app_name      = var.app_name
  environment   = var.environment
  s3_bucket_arn = module.s3.bucket_arn
}

# DocumentDB (MongoDB-compatible)
module "documentdb" {
  source = "./modules/documentdb"

  app_name            = var.app_name
  environment         = var.environment
  db_subnet_ids       = module.vpc.private_subnet_ids
  security_group_id   = module.vpc.documentdb_security_group_id
  master_username     = var.documentdb_username
  master_password     = var.documentdb_password
  engine_version      = var.documentdb_engine_version
  skip_final_snapshot = var.environment == "dev"

  count = var.enable_documentdb ? 1 : 0
}

# Security group rule to allow ECS tasks to access DocumentDB
resource "aws_security_group_rule" "ecs_to_documentdb" {
  count                    = var.enable_documentdb ? 1 : 0
  type                     = "ingress"
  from_port                = 27017
  to_port                  = 27017
  protocol                 = "tcp"
  security_group_id        = module.vpc.documentdb_security_group_id
  source_security_group_id = module.ecs.security_group_id
  description              = "Allow ECS tasks to access DocumentDB"
}

# Secrets Management
module "secrets" {
  source = "./modules/secrets"

  app_name            = var.app_name
  environment         = var.environment
  aws_region          = var.aws_region
  ecs_task_role_id    = module.iam.ecs_task_role_id
  openai_api_key      = var.openai_api_key
  jwt_secret          = var.jwt_secret
  documentdb_password = var.documentdb_password
}

# WAF for ALB
module "waf" {
  source = "./modules/waf"

  app_name   = var.app_name
  aws_region = var.aws_region
  alb_arn    = module.alb.arn
}

# ECS Cluster and Service
module "ecs" {
  source = "./modules/ecs"

  app_name             = var.app_name
  environment          = var.environment
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  alb_target_group_arn = module.alb.target_group_arn
  aws_region           = var.aws_region

  # Container configuration
  container_image  = var.container_image
  container_port   = var.container_port
  container_cpu    = var.container_cpu
  container_memory = var.container_memory

  # Task configuration
  task_execution_role_arn = module.iam.ecs_task_execution_role_arn
  task_role_arn           = module.iam.ecs_task_role_arn

  # Environment variables for the backend
  environment_variables = {
    AWS_REGION     = var.aws_region
    ENVIRONMENT    = var.environment
    S3_BUCKET      = module.s3.bucket_name
    OPENAI_API_KEY = var.openai_api_key
    JWT_SECRET     = var.jwt_secret
    MONGO_URL      = var.enable_documentdb ? "mongodb://${var.documentdb_username}:${var.documentdb_password}@${module.documentdb[0].cluster_endpoint}:27017/?tls=true&tlsCAFile=rds-combined-ca-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false" : coalesce(var.mongodb_uri, "mongodb://localhost:27017")
    DB_NAME        = "verita_ai_interview"
    LOG_LEVEL      = var.environment == "prod" ? "INFO" : "DEBUG"
    CORS_ORIGINS   = "http://localhost:3000,http://localhost:8000,https://staging.interview.verita-ai.com,https://interview.verita-ai.com,https://staging.dashboard.verita-ai.com,https://dashboard.verita-ai.com"
  }

  # Scaling configuration
  desired_task_count = var.desired_task_count
  min_task_count     = var.min_task_count
  max_task_count     = var.max_task_count

  depends_on = [
    module.vpc,
    module.alb,
    module.iam,
    module.secrets,
  ]
}

# Monitoring and Alerting
module "monitoring" {
  source = "./modules/monitoring"

  app_name              = var.app_name
  environment           = var.environment
  aws_region            = var.aws_region
  alert_email           = var.alert_email
  ecs_cluster_name      = module.ecs.cluster_name
  ecs_service_name      = module.ecs.service_name
  max_task_count        = var.max_task_count
  alb_name              = split("/", module.alb.arn)[1]
  target_group_name     = module.alb.target_group_name
  documentdb_cluster_id = var.enable_documentdb ? module.documentdb[0].cluster_id : ""

  depends_on = [
    module.ecs,
    module.documentdb,
  ]
}

# Interview Frontend (Amplify)
module "interview_frontend" {
  source = "./modules/amplify"

  app_name                = "${var.app_name}-interview"
  environment             = var.environment
  repository_url          = var.github_repository_url
  build_path              = "interview-frontend"
  iam_service_role_arn    = module.iam.amplify_role_arn
  production_domain       = "interview.verita-ai.com"
  staging_subdomain_prefix = "staging"

  # Common environment variables
  environment_variables = {}

  # Production-specific environment variables
  production_environment_variables = {
    REACT_APP_BACKEND_URL = "https://api.verita-ai.com"
  }

  # Development-specific environment variables
  development_environment_variables = {
    REACT_APP_BACKEND_URL = "https://staging.api.verita-ai.com"
  }
}

# Dashboard Frontend (Amplify)
module "dashboard_frontend" {
  source = "./modules/amplify"

  app_name                = "${var.app_name}-dashboard"
  environment             = var.environment
  repository_url          = var.github_repository_url
  build_path              = "dashboard-frontend"
  iam_service_role_arn    = module.iam.amplify_role_arn
  production_domain       = "dashboard.verita-ai.com"
  staging_subdomain_prefix = "staging"

  # Common environment variables
  environment_variables = {}

  # Production-specific environment variables
  production_environment_variables = {
    REACT_APP_BACKEND_URL = "https://api.verita-ai.com"
  }

  # Development-specific environment variables
  development_environment_variables = {
    REACT_APP_BACKEND_URL = "https://staging.api.verita-ai.com"
  }
}
