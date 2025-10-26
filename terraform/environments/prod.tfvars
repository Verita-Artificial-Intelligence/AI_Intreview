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
domain_name = "api.yourdomain.com" # CHANGE THIS TO YOUR DOMAIN

# Sensitive variables (set via environment or terraform.tfvars)
# container_image = "123456789.dkr.ecr.us-east-1.amazonaws.com/verita-backend:v1.0.0"
# openai_api_key = "sk-..."
# jwt_secret = "your-strong-secret-key"
# documentdb_password = "VeryStrongPassword123!ABC"
# alert_email = "alerts@yourdomain.com"
