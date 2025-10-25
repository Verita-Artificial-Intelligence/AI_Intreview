# Terraform Configuration for Verita AI Interview Platform

This directory contains production-ready Terraform code to deploy the Verita AI Interview platform on AWS.

## Architecture Overview

```
┌─────────────────┐
│   Route 53      │
└────────┬────────┘
         │
    ┌────▼──────────┐
    │  CloudFront   │
    │  (optional)   │
    └────┬──────────┘
         │
    ┌────▼──────────────────────────┐
    │ Application Load Balancer      │
    │ (sticky sessions for WebSocket)│
    └────┬───────────────────────────┘
         │
    ┌────▼──────────────────────┐
    │  ECS Cluster (Fargate)    │
    │  - Backend API Containers │
    │  - Auto-scaling enabled   │
    └────┬──────────────────────┘
         │
    ┌────┴───────────┬──────────────┐
    │                │              │
┌───▼────┐    ┌──────▼──────┐   ┌──▼──────┐
│ DocDB  │    │ S3 Uploads  │   │ ECR     │
│ (Mongo)│    │             │   │ Images  │
└────────┘    └─────────────┘   └─────────┘
```

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured with credentials
3. **Terraform** >= 1.0
4. **Docker** for building and pushing backend image to ECR
5. **Backend FastAPI application** containerized and ready

## Initial Setup

### 1. Build and Push Docker Image

First, build your backend Docker image and push it to Amazon ECR:

```bash
# Create ECR repository
aws ecr create-repository --repository-name verita-backend --region us-east-1

# Build Docker image
cd backend/
docker build -t verita-backend:latest .

# Tag image for ECR
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
docker tag verita-backend:latest $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/verita-backend:latest

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker push $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/verita-backend:latest
```

### 2. Create S3 Backend for Terraform State

```bash
# Create S3 bucket for state (name must be globally unique)
TERRAFORM_STATE_BUCKET="your-org-terraform-state-$(date +%s)"
aws s3 mb s3://$TERRAFORM_STATE_BUCKET --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket $TERRAFORM_STATE_BUCKET \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1
```

### 3. Configure Terraform Backend

Uncomment the `backend "s3"` block in `backend.tf` and fill in your S3 bucket:

```hcl
terraform {
  backend "s3" {
    bucket         = "your-org-terraform-state-XXXX"
    key            = "verita-ai-interview/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

### 4. Create terraform.tfvars

Create a `terraform.tfvars` file with sensitive values (never commit this):

```hcl
container_image      = "123456789.dkr.ecr.us-east-1.amazonaws.com/verita-backend:latest"
openai_api_key       = "sk-..."  # Your OpenAI API key
jwt_secret           = "your-very-secure-secret-key"
documentdb_password  = "StrongPassword123!"  # Change this!
```

## Deployment

### Development Environment

```bash
terraform init
terraform plan -var-file="environments/dev.tfvars" -var-file="terraform.tfvars"
terraform apply -var-file="environments/dev.tfvars" -var-file="terraform.tfvars"
```

### Production Environment

```bash
terraform init
terraform plan -var-file="environments/prod.tfvars" -var-file="terraform.tfvars"
terraform apply -var-file="environments/prod.tfvars" -var-file="terraform.tfvars"
```

## Outputs

After deployment, retrieve important values:

```bash
terraform output alb_dns_name        # ALB endpoint for frontend config
terraform output s3_bucket_name      # S3 bucket for uploads
terraform output documentdb_endpoint # DocumentDB connection string
```

## Configuration

### Environment Variables

The ECS task receives these environment variables automatically:
- `AWS_REGION` - AWS region
- `S3_BUCKET` - S3 bucket name
- `OPENAI_API_KEY` - OpenAI API key
- `JWT_SECRET` - JWT signing secret
- `MONGODB_URI` - DocumentDB connection string
- `LOG_LEVEL` - DEBUG (dev) or INFO (prod)

### Scaling Configuration

Adjust auto-scaling by modifying variables:

```hcl
desired_task_count = 2    # Initial number of tasks
min_task_count     = 2    # Minimum during scale-in
max_task_count     = 6    # Maximum during scale-out
```

CPU and memory thresholds are set to:
- **CPU**: Scale out at 70% utilization
- **Memory**: Scale out at 80% utilization

### DocumentDB Configuration

For production, ensure:
- Enable backups: `backup_retention_period = 30`
- Enable encryption: `storage_encrypted = true`
- Enable deletion protection: `deletion_protection = true`
- Use strong password via Secrets Manager

### SSL/HTTPS

To add HTTPS:

1. Create an ACM certificate:
```bash
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --region us-east-1
```

2. Update ALB module variables:
```hcl
create_https_listener = true
certificate_arn       = "arn:aws:acm:..."
```

3. Re-apply Terraform

## Monitoring

CloudWatch metrics are automatically enabled:
- ECS task CPU and memory usage
- ALB request count and latency
- DocumentDB CPU and connections

View logs:
```bash
# ECS logs
aws logs tail /ecs/verita-ai-interview-dev --follow

# DocumentDB logs
aws docdb describe-db-clusters --query 'DBClusters[0].EnabledCloudwatchLogsExports'
```

## Security Best Practices

✅ **Implemented:**
- VPC with public/private subnets across 2 AZs
- DocumentDB encryption at rest with KMS
- S3 bucket with public access blocked
- IAM roles with least privilege
- Security groups for network isolation
- Secrets marked as sensitive in outputs

⚠️ **TODO:**
- Store sensitive values in AWS Secrets Manager (not in tfvars)
- Enable WAF on ALB for production
- Set up CloudTrail for audit logging
- Configure VPC Flow Logs
- Use private ECR with credential rotation

## Troubleshooting

### ECS tasks not starting
```bash
# Check task logs
aws logs tail /ecs/verita-ai-interview-dev --follow

# Check ECS service events
aws ecs describe-services \
  --cluster verita-ai-interview-cluster \
  --services verita-ai-interview-service
```

### DocumentDB connection issues
- Ensure security groups allow inbound on port 27017
- Verify the ECS security group is added to DocumentDB's allowed list
- Check credentials in MONGODB_URI

### ALB returning 502/503
- Check if ECS tasks are healthy: `aws ecs describe-services ...`
- Verify backend is listening on 8000
- Check FastAPI `/health` endpoint

## Cleanup

To destroy all resources:

```bash
# Development
terraform destroy -var-file="environments/dev.tfvars" -var-file="terraform.tfvars"

# Production (requires additional confirmation)
terraform destroy -var-file="environments/prod.tfvars" -var-file="terraform.tfvars"
```

⚠️ **Warning**: This will delete:
- ECS cluster and services
- RDS/DocumentDB databases (final snapshot created for prod)
- S3 bucket (with all uploads)
- VPC and networking resources

## Cost Estimation

**Monthly estimate (dev environment):**
- ALB: ~$15
- ECS (1 task, 512 CPU/1GB RAM): ~$10
- DocumentDB (t3.medium, 1 instance): ~$40
- S3: ~$1-5
- **Total: ~$65-75/month**

**Monthly estimate (prod environment):**
- ALB: ~$15
- ECS (3 tasks, 1 vCPU/2GB RAM): ~$60
- DocumentDB (t3.medium, 2 instances): ~$80
- S3: ~$5-10
- **Total: ~$160-165/month**

## Additional Resources

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-best-practices.html)
- [DocumentDB Documentation](https://docs.aws.amazon.com/documentdb/latest/developerguide/)
- [WebSocket with ALB](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-websocket.html)

## Getting Help

For issues:
1. Check CloudWatch logs
2. Review Terraform state: `terraform show`
3. Test connectivity: `aws sts get-caller-identity`
4. Check AWS quotas in your account
