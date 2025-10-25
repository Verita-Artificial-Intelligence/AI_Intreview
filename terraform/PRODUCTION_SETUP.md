# Production Setup Guide

This guide covers the essential security and reliability features needed for production deployment.

## 1. HTTPS/TLS Configuration (Critical)

### Step 1: Set Your Domain

Edit `environments/prod.tfvars`:
```hcl
domain_name = "api.yourdomain.com"  # Your actual domain
```

### Step 2: Create DNS Records (After First Apply)

When you run `terraform apply`, it will create an ACM certificate request. You'll need to validate it:

```bash
# After applying, check ACM console for DNS validation records
aws acm describe-certificate --certificate-arn <certificate-arn> --region us-east-1
```

AWS will show you a CNAME record to add to your DNS provider:
```
Name:   _xxxxx.api.yourdomain.com
Type:   CNAME
Value:  _yyyyy.acm-validations.aws.
```

Add this to your DNS provider (Route53, GoDaddy, etc.) and Terraform will automatically validate it.

### Step 3: Point Domain to ALB

After validation, create an alias record in your DNS:
```
Name:   api.yourdomain.com
Type:   A (or ALIAS)
Value:  <ALB DNS name from terraform output>
```

Test:
```bash
curl https://api.yourdomain.com/health
```

---

## 2. Secrets Management (Critical)

**Never store secrets in tfvars or version control.** Use environment variables:

```bash
# Create terraform.tfvars with only secrets (add to .gitignore!)
cat > terraform/terraform.tfvars << 'EOF'
container_image      = "123456789.dkr.ecr.us-east-1.amazonaws.com/verita-backend:v1.0.0"
openai_api_key       = "sk-your-actual-key"
jwt_secret           = "your-very-long-random-secret-min-32-chars"
documentdb_password  = "GenerateRandomPassword123!@#"
alert_email          = "devops@yourdomain.com"
EOF

# Verify it's gitignored
echo "terraform.tfvars" >> terraform/.gitignore
```

**Important:** All secrets are automatically stored in AWS Secrets Manager, not passed as environment variables to containers. The tfvars file is only used during Terraform apply.

---

## 3. Monitoring & Alerts (Critical)

### Email Notifications

Specify your alert email:
```hcl
alert_email = "alerts@yourdomain.com"
```

After deployment, check your email for SNS subscription confirmation and click the link.

### CloudWatch Dashboards

Access your dashboard:
```bash
terraform output dashboard_url
```

Or navigate to CloudWatch → Dashboards → verita-ai-interview-prod

### What's Monitored

✅ **ECS Service**
- No healthy tasks running
- Task failures

✅ **Load Balancer**
- High HTTP 5xx errors
- Unhealthy targets

✅ **Database**
- High CPU usage (>85%)
- Replication lag (>5 seconds)
- Connection limit warnings

✅ **Security**
- WAF blocking suspicious requests

---

## 4. WAF Configuration (Essential)

WAF automatically protects your ALB with:

- **AWS Managed Rules** - Protects against OWASP top 10
- **Rate Limiting** - 2000 requests per 5 minutes per IP
- **Known Bad Inputs** - Blocks known attack patterns

### If You Need Custom Rules

Edit `modules/waf/main.tf` to add IP allowlists, custom rate limits, etc.

### Monitoring WAF Blocks

```bash
# View blocked requests
aws wafv2 get-sampled-requests \
  --web-acl-arn <web-acl-arn> \
  --rule-metric-name AWSManagedRulesCommonRuleSet \
  --scope REGIONAL \
  --time-window StartTime=<timestamp>,EndTime=<timestamp> \
  --max-items 100
```

---

## 5. Database Security

### DocumentDB Backups

Automatic daily backups are enabled with 30-day retention. Test restores periodically:

```bash
# List backups
aws docdb describe-db_cluster_snapshots \
  --db-cluster-identifier verita-ai-interview-cluster
```

### Database Encryption

✅ Encryption at rest enabled with KMS
✅ TLS enforced for connections
✅ Credentials stored in Secrets Manager

---

## 6. Pre-Deployment Checklist

- [ ] Domain purchased and DNS access confirmed
- [ ] AWS account ready with appropriate permissions
- [ ] Docker image built and pushed to ECR
- [ ] OpenAI API key and JWT secret generated
- [ ] Database password strong (24+ chars with mixed case, numbers, symbols)
- [ ] Alert email configured and confirmed
- [ ] prod.tfvars domain name updated
- [ ] terraform.tfvars created with all secrets
- [ ] terraform.tfvars added to .gitignore

---

## 7. Deployment Steps

### First Time Setup

```bash
cd terraform

# Initialize
terraform init

# Plan (review changes)
terraform plan -var-file="environments/prod.tfvars"

# Apply
terraform apply -var-file="environments/prod.tfvars"

# Save outputs
terraform output > /tmp/prod-outputs.txt
```

### After Deployment

1. **Validate HTTPS**
   ```bash
   curl -I https://api.yourdomain.com/health
   ```

2. **Check Logs**
   ```bash
   aws logs tail /ecs/verita-ai-interview-prod --follow
   ```

3. **Verify Database**
   ```bash
   # Get connection string from outputs
   terraform output documentdb_connection_string
   ```

4. **Test Monitoring**
   - Check CloudWatch dashboard
   - Confirm SNS alert email subscription active

---

## 8. Ongoing Operations

### Update Backend Code

```bash
# Build new image
cd backend/
docker build -t verita-backend:v1.0.1 .
docker tag verita-backend:v1.0.1 $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/verita-backend:v1.0.1
docker push $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/verita-backend:v1.0.1

# Update Terraform
# Edit environments/prod.tfvars to change container_image
container_image = "...dkr.ecr.us-east-1.amazonaws.com/verita-backend:v1.0.1"

# Deploy
terraform apply -var-file="environments/prod.tfvars"
```

### Scaling Changes

```bash
# Edit environments/prod.tfvars
desired_task_count = 5  # Increase from 3

terraform apply -var-file="environments/prod.tfvars"
```

### Monitoring Costs

```bash
aws ce get-cost-and-usage \
  --time-period Start=2024-10-01,End=2024-10-31 \
  --granularity DAILY \
  --metrics "BlendedCost"
```

---

## 9. Security Best Practices

### ✅ Implemented

- VPC with private subnets for compute
- Database encryption at rest
- HTTPS/TLS for all traffic
- WAF with rate limiting
- CloudWatch monitoring
- IAM roles with least privilege
- Secrets stored in Secrets Manager

### ⚠️ Consider Adding

For higher security requirements:

1. **Multi-region failover** - Replicate to secondary region
2. **CloudTrail** - Audit all API calls
3. **VPC Flow Logs** - Monitor network traffic
4. **Additional WAF rules** - Custom IP allowlists
5. **Backup encryption** - Encrypt database snapshots
6. **API rate limiting** - In application code
7. **DDoS protection** - AWS Shield Advanced

---

## 10. Disaster Recovery

### Backup Strategy

- DocumentDB: Daily automatic backups (30 days)
- S3: Versioning enabled
- Code: Git repository

### RTO/RPO Targets

| Component | RTO | RPO |
|-----------|-----|-----|
| ECS | 5 min (auto-recover) | 0 (stateless) |
| Database | 30 min (restore snapshot) | 1 day |
| S3 | 1 hour (restore version) | 1 hour |

### Recovery Procedures

**ECS Task Failure:** Automatic recovery by auto-scaling (30 seconds)

**Database Failure:** Manual restore from snapshot
```bash
# List snapshots
aws docdb describe-db-cluster-snapshots

# Restore to new cluster (1+ hours)
# Then update ECS environment variables with new endpoint
```

**Data Corruption:** Restore from S3 version history
```bash
aws s3api list-object-versions --bucket <bucket-name>
aws s3api get-object --bucket <bucket-name> --key <key> --version-id <version-id> <file>
```

---

## 11. Troubleshooting

### Certificate Validation Stuck

If ACM certificate is pending validation:
```bash
# Check certificate status
aws acm describe-certificate \
  --certificate-arn <arn> \
  --region us-east-1

# Add DNS records shown to your provider
# Can take 5-60 minutes to validate
```

### ALB Returning 502/503

```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn <arn>

# Check ECS task logs
aws logs tail /ecs/verita-ai-interview-prod --follow

# Verify backend health endpoint
curl http://<task-ip>:8000/health
```

### High Database CPU

```bash
# Check slow queries
aws docdb describe-db-clusters \
  --db-cluster-identifier verita-ai-interview-cluster \
  --query 'DBClusters[0].EnabledCloudwatchLogsExports'

# Review logs
aws logs tail /aws/docdb/verita-ai-interview/error --follow
```

---

## Support

For issues:
1. Check CloudWatch Logs
2. Review Terraform state: `terraform show`
3. Check AWS CloudFormation events (nested stack)
4. Review security group rules
5. Verify IAM permissions
