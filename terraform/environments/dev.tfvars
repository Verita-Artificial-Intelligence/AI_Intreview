# Development Environment Configuration

aws_region  = "us-east-1"
environment = "dev"
app_name    = "verita-ai-interview"

# Networking
vpc_cidr = "10.0.0.0/16"

# Container configuration
container_port   = 8000
container_cpu    = 512
container_memory = 1024

# Scaling
desired_task_count = 1
min_task_count     = 1
max_task_count     = 3

# DocumentDB
documentdb_username       = "dbadmin"
documentdb_engine_version = "5.0.0"
enable_documentdb         = true

# S3
enable_versioning      = false
enable_lifecycle_rules = false

# HTTPS
domain_name = "staging.api.verita-ai.com"

# Sensitive variables
container_image     = "015312928304.dkr.ecr.us-east-1.amazonaws.com/verita-backend:dev-latest"
jwt_secret          = "8f18aca95fbbf818805003c1d1cd1a71"
documentdb_password = "WyGkayfXp7lLhDGdKjIBL7UZbEc="
alert_email         = "nicholas@intrace.ai"
iam_role_arn        = "arn:aws:iam::015312928304:role/github-actions-terraform"

# Clerk Candidate (Interview Frontend) - TEST keys
clerk_candidate_jwks_url   = "https://emerging-pheasant-9.clerk.accounts.dev/.well-known/jwks.json"
clerk_candidate_issuer     = "https://emerging-pheasant-9.clerk.accounts.dev"
clerk_candidate_secret_key = "sk_test_V45Vk8CZ4tk8yyZ9rbYeXR0SRofZl6DJyxgyNgL84E"

# Clerk Admin (Dashboard Frontend) - TEST keys
clerk_admin_jwks_url   = "https://boss-eel-27.clerk.accounts.dev/.well-known/jwks.json"
clerk_admin_issuer     = "https://boss-eel-27.clerk.accounts.dev"
clerk_admin_secret_key = "sk_test_HRTDt3PDEBK4qOydwy1kWX6t9knsoyhcWeuvmguWiT"

# Authorized parties for staging
clerk_authorized_parties = "http://localhost:3000,http://localhost:3001,https://staging.interview.verita-ai.com,https://staging.dashboard.verita-ai.com"

# AWS SES Email Configuration (Development)
ses_region           = "us-east-1"
ses_access_key_id    = "YOUR_SES_ACCESS_KEY_ID_HERE"
ses_secret_access_key = "YOUR_SES_SECRET_ACCESS_KEY_HERE"
ses_from_address     = "noreply@staging.verita-ai.com"

# Email Branding
company_name     = "Verita"
company_logo_url = "https://staging.verita-ai.com/logo.png"
support_email    = "support@verita-ai.com"
