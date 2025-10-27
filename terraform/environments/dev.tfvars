# Development Environment Configuration
# Trigger deployment

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
domain_name = "" # Leave empty for HTTP-only in dev, or set to "api.dev.yourdomain.com"

# Sensitive variables (set via secrets.tfvars)
# container_image = "123456789.dkr.ecr.us-east-1.amazonaws.com/verita-backend:latest"
# openai_api_key = "sk-..."
# jwt_secret = "your-secret-key"
# documentdb_password = "SecurePassword123!"
# alert_email = "your-email@example.com"
