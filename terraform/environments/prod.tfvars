# Production Environment Configuration

aws_region  = "us-east-1"
environment = "prod"
app_name    = "verita-ai-interview"

# GitHub Repository
github_repository_url = "https://github.com/Verita-Artificial-Intelligence/AI_Intreview"

# Networking
vpc_cidr = "10.0.0.0/16"

# Container configuration
container_port   = 8000
container_cpu    = 1024
container_memory = 2048

# Scaling
desired_task_count = 3
min_task_count     = 3
max_task_count     = 10

# DocumentDB
documentdb_username       = "dbadmin"
documentdb_engine_version = "5.0.0"
enable_documentdb         = true

# S3
enable_versioning      = true
enable_lifecycle_rules = true
object_expiration_days = 180

# HTTPS (REQUIRED for production)
domain_name = "api.verita-ai.com"

# Sensitive variables
container_image     = "015312928304.dkr.ecr.us-east-1.amazonaws.com/verita-backend:prod-latest"
jwt_secret          = "8f18aca95fbbf818805003c1d1cd1a71"
documentdb_password = "IXy8rceLUYap5pMldfie+Gy1fXA="
alert_email         = "nicholas@intrace.ai"
iam_role_arn        = "arn:aws:iam::015312928304:role/github-actions-terraform"

# Clerk Candidate (Interview Frontend) - LIVE keys
# TODO: Get production Clerk keys from Clerk dashboard
clerk_candidate_jwks_url   = "https://YOUR-PROD-INSTANCE.clerk.accounts.dev/.well-known/jwks.json"
clerk_candidate_issuer     = "https://YOUR-PROD-INSTANCE.clerk.accounts.dev"
clerk_candidate_secret_key = "sk_live_YOUR_LIVE_SECRET_KEY_HERE"

# Clerk Admin (Dashboard Frontend) - LIVE keys
# TODO: Get production Clerk keys from Clerk dashboard
clerk_admin_jwks_url   = "https://YOUR-PROD-INSTANCE.clerk.accounts.dev/.well-known/jwks.json"
clerk_admin_issuer     = "https://YOUR-PROD-INSTANCE.clerk.accounts.dev"
clerk_admin_secret_key = "sk_live_YOUR_LIVE_SECRET_KEY_HERE"

# Authorized parties for production
clerk_authorized_parties = "https://interview.verita-ai.com,https://dashboard.verita-ai.com"

# AWS SES Email Configuration
ses_region           = "us-east-1"
ses_access_key_id    = "YOUR_SES_ACCESS_KEY_ID_HERE"
ses_secret_access_key = "YOUR_SES_SECRET_ACCESS_KEY_HERE"
ses_from_address     = "noreply@verita-ai.com"

# Email Branding
company_name     = "Verita"
company_logo_url = "https://verita-ai.com/logo.png"
support_email    = "support@verita-ai.com"
