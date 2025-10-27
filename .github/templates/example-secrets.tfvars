# EXAMPLE: This is what your secrets.tfvars should look like
# DO NOT COMMIT THIS FILE - Store these values in GitHub Secrets instead
#
# Usage:
# 1. Copy this file: cp .github/templates/example-secrets.tfvars terraform/secrets.tfvars.example
# 2. Fill in your actual values
# 3. Convert to base64: base64 -w 0 < terraform/secrets.tfvars.example
# 4. Add to GitHub Secrets as TF_VARS_FILE_DEV or TF_VARS_FILE_PROD

# Docker image in ECR
# Use environment-specific tags so ECS always pulls the latest built image for that environment
# Docker build workflow automatically pushes new images with these tags
container_image = "123456789.dkr.ecr.us-east-1.amazonaws.com/verita-backend:prod-latest"  # prod
# container_image = "123456789.dkr.ecr.us-east-1.amazonaws.com/verita-backend:dev-latest"   # dev

# OpenAI Realtime API key (get from https://platform.openai.com/api-keys)
openai_api_key = "sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# JWT signing secret - generate a random 32+ character string
# Example: openssl rand -base64 32
jwt_secret = "your-very-long-random-jwt-secret-minimum-32-characters"

# DocumentDB master password - strong password required
# Requirements: 8-41 chars, at least one uppercase, one lowercase, one digit, one special char
documentdb_password = "SecurePassword123!@#$%^&*()"

# Email for CloudWatch alarm notifications
alert_email = "alerts@yourdomain.com"

# Domain name for HTTPS (optional for dev, required for prod)
# domain_name = "api.dev.yourdomain.com"  # dev
# domain_name = "api.yourdomain.com"      # prod

# AWS SES Email Configuration
ses_access_key_id     = "AKIAxxxxxxxxxxxxxxxx"
ses_secret_access_key = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
ses_from_address      = "noreply@yourdomain.com"

# Email Branding (used in assignment emails)
company_name     = "Your Company"
company_logo_url = "https://yourdomain.com/logo.png"
support_email    = "support@yourdomain.com"
