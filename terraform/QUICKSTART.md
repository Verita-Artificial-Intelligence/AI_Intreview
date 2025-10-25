# Terraform Quick Start

## 1. Prerequisites

```bash
# Check Terraform is installed
terraform version

# Check AWS credentials
aws sts get-caller-identity

# Get your account ID (you'll need this)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo $ACCOUNT_ID
```

## 2. Build and Push Docker Image

```bash
# Create ECR repo
aws ecr create-repository --repository-name verita-backend

# Login to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push
cd backend/
docker build -t verita-backend:latest .
docker tag verita-backend:latest $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/verita-backend:latest
docker push $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/verita-backend:latest
cd ..
```

## 3. Create terraform.tfvars

```bash
cat > terraform/terraform.tfvars << 'EOF'
container_image     = "$ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/verita-backend:latest"
openai_api_key      = "sk-your-key-here"
jwt_secret          = "your-jwt-secret-here"
documentdb_password = "YourSecurePassword123!"
EOF

# Replace with actual values!
```

## 4. Initialize Terraform

```bash
cd terraform
terraform init
```

## 5. Deploy (Development)

```bash
# See what will be created
terraform plan -var-file="environments/dev.tfvars"

# Create resources
terraform apply -var-file="environments/dev.tfvars"

# Get the ALB URL
terraform output alb_dns_name
```

## Common Commands

### View current infrastructure
```bash
terraform show
terraform state list
```

### Update after changes
```bash
terraform plan -var-file="environments/dev.tfvars"
terraform apply -var-file="environments/dev.tfvars"
```

### Scale tasks up/down
```bash
# Edit terraform/variables.tf or create a .tfvars file with:
# desired_task_count = 5
terraform apply -var-file="environments/dev.tfvars"
```

### Check outputs
```bash
terraform output
terraform output alb_dns_name
terraform output s3_bucket_name
```

### Destroy (WARNING: deletes everything)
```bash
terraform destroy -var-file="environments/dev.tfvars"
```

## Troubleshooting

### Tasks not starting?
```bash
# Check logs
aws logs tail /ecs/verita-ai-interview-dev --follow

# Check task status
aws ecs list-tasks --cluster verita-ai-interview-cluster
aws ecs describe-tasks --cluster verita-ai-interview-cluster --tasks <task-arn>
```

### ECR image not found?
```bash
# Verify image was pushed
aws ecr describe-images --repository-name verita-backend

# Check your image URI in terraform.tfvars
```

### ALB returning errors?
```bash
# Check target health
aws elbv2 describe-target-health --target-group-arn <tg-arn>

# Check backend logs
aws logs tail /ecs/verita-ai-interview-dev --follow
```

## Update Backend Code

When you update the FastAPI backend:

```bash
# Build and push new image
cd backend/
docker build -t verita-backend:latest .
docker tag verita-backend:latest $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/verita-backend:latest
docker push $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/verita-backend:latest
cd ..

# Force ECS to pull latest image
aws ecs update-service \
  --cluster verita-ai-interview-cluster \
  --service verita-ai-interview-service \
  --force-new-deployment
```

## Scale to Production

When ready to deploy to production:

```bash
terraform plan -var-file="environments/prod.tfvars"
terraform apply -var-file="environments/prod.tfvars"
```

**Key differences in prod:**
- 3 ECS tasks instead of 1
- Larger instances (1 vCPU/2GB vs 512 CPU/1GB)
- 30-day database backups
- HTTPS enabled (requires ACM certificate)
- Deletion protection enabled
