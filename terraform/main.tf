
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

  app_name                   = var.app_name
  environment                = var.environment
  aws_region                 = var.aws_region
  ecs_task_role_id           = module.iam.ecs_task_role_id
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
    MONGO_URL      = var.enable_documentdb ? "mongodb://${urlencode(var.documentdb_username)}:${urlencode(var.documentdb_password)}@${module.documentdb[0].cluster_endpoint}:27017/?tls=true&tlsCAFile=rds-combined-ca-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false" : coalesce(var.mongodb_uri, "mongodb://localhost:27017")
    DB_NAME        = "verita_ai_interview"
    LOG_LEVEL      = var.environment == "prod" ? "INFO" : "DEBUG"
    CORS_ORIGINS   = "http://localhost:3000,http://localhost:8000,https://staging.interview.verita-ai.com,https://interview.verita-ai.com,https://staging.dashboard.verita-ai.com,https://dashboard.verita-ai.com"

    # Clerk Candidate Configuration
    CLERK_CANDIDATE_JWKS_URL   = var.clerk_candidate_jwks_url
    CLERK_CANDIDATE_ISSUER     = var.clerk_candidate_issuer
    CLERK_CANDIDATE_SECRET_KEY = var.clerk_candidate_secret_key

    # Clerk Admin Configuration
    CLERK_ADMIN_JWKS_URL   = var.clerk_admin_jwks_url
    CLERK_ADMIN_ISSUER     = var.clerk_admin_issuer
    CLERK_ADMIN_SECRET_KEY = var.clerk_admin_secret_key

    # Authorized Parties
    CLERK_AUTHORIZED_PARTIES = var.clerk_authorized_parties

    # AWS SES Email Configuration
    SES_REGION            = var.ses_region
    SES_ACCESS_KEY_ID     = var.ses_access_key_id
    SES_SECRET_ACCESS_KEY = var.ses_secret_access_key
    SES_FROM_ADDRESS      = var.ses_from_address

    # Email Branding
    COMPANY_NAME     = var.company_name
    COMPANY_LOGO_URL = var.company_logo_url
    SUPPORT_EMAIL    = var.support_email
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
