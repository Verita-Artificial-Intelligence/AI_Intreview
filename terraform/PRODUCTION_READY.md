# Production-Ready Infrastructure

This Terraform configuration provides a complete, production-ready deployment for the Verita AI Interview platform on AWS. All essential security and reliability features are included.

## ✅ What's Included

### Security (Essential)
- **HTTPS/TLS** - Automatic ACM certificate provisioning with domain validation
- **Secrets Management** - All credentials stored in AWS Secrets Manager
- **WAF** - AWS Managed Rules + rate limiting on ALB
- **VPC Isolation** - Private subnets for ECS, public only for ALB
- **Database Encryption** - DocumentDB encryption at rest with KMS
- **IAM Roles** - Least privilege access per component
- **Security Groups** - Restricted ingress/egress rules

### Reliability (Essential)
- **Auto-scaling** - ECS tasks scale 2-10 based on CPU/memory
- **Health Checks** - ALB monitors backend health
- **Multi-AZ** - Database and load balancer across 2 availability zones
- **Database Backups** - Daily automatic backups with 30-day retention
- **Graceful Shutdown** - 30-second deregistration delay for connections

### Monitoring & Alerting (Essential)
- **CloudWatch Dashboards** - Real-time visualization of key metrics
- **CloudWatch Alarms** - Email alerts for critical issues
- **ECS Task Logs** - Automatic log aggregation
- **Database Logs** - Audit, error, and general logs
- **WAF Metrics** - Track blocked requests

### What's NOT Included (Not Essential for Initial Launch)
- Multi-region deployment
- CloudFront CDN
- AWS Shield Advanced (DDoS)
- CloudTrail audit logging
- VPC Flow Logs
- Compliance frameworks (HIPAA, SOC2, etc.)

---

## Quick Start

### 1. Prerequisites
```bash
# Have ready:
- AWS account with appropriate permissions
- Domain name (for HTTPS)
- OpenAI API key
- Docker image in ECR
```

### 2. Create Secrets File
```bash
cd terraform/
cat > terraform.tfvars << 'EOF'
container_image      = "123456789.dkr.ecr.us-east-1.amazonaws.com/verita-backend:latest"
openai_api_key       = "sk-..."
jwt_secret           = "generate-a-random-32-char-string"
documentdb_password  = "GenerateSecurePassword123!@#"
alert_email          = "alerts@yourdomain.com"
EOF
```

### 3. Deploy
```bash
terraform init
terraform plan -var-file="environments/prod.tfvars"
terraform apply -var-file="environments/prod.tfvars"
```

### 4. Configure HTTPS
See `PRODUCTION_SETUP.md` section 1 for domain setup instructions.

---

## Security Checklist

**Before Going Live:**

- [ ] Domain configured with HTTPS
- [ ] HTTPS certificate validated in ACM
- [ ] SNS alert email confirmed
- [ ] Database password is strong (24+ chars)
- [ ] OpenAI API key rotated and secure
- [ ] JWT secret is cryptographically random
- [ ] terraform.tfvars is in .gitignore (never commit!)
- [ ] Terraform state bucket has versioning + encryption
- [ ] CloudWatch dashboard reviewed
- [ ] WAF is blocking suspicious requests (check logs)

**After Going Live:**

- [ ] Test HTTPS endpoints with certificate validation
- [ ] Verify backend logs appear in CloudWatch
- [ ] Test monitoring by triggering a test alarm
- [ ] Perform a backup/restore test
- [ ] Load test to verify auto-scaling works
- [ ] Test database failover (mark an instance unhealthy)

---

## Cost Estimate (USD/month)

| Component | Dev | Prod |
|-----------|-----|------|
| ALB | $15 | $15 |
| ECS (Fargate) | $10 | $60 |
| DocumentDB | $40 | $80 |
| S3 | $1-5 | $5-10 |
| Secrets Manager | $0.40 | $0.40 |
| CloudWatch Logs | $2-5 | $5-10 |
| **Total** | **$68-75** | **$165-175** |

---

## Feature Comparison: Before vs After

### Before (Initial Proposal)
```
ECS + ALB + DocumentDB + S3
```

### After (Production-Ready)
```
ECS + ALB + DocumentDB + S3 + ACM + WAF + Secrets Manager + CloudWatch
```

**Added Security:**
- HTTPS instead of HTTP
- Secrets encrypted in Secrets Manager
- WAF protection against attacks
- Monitoring with email alerts

**Added Reliability:**
- Automatic backups
- Multi-AZ deployment
- Auto-scaling
- Health checks

**Configuration:**
- Modular Terraform with 6 modules
- Environment-specific tfvars (dev/prod)
- Comprehensive documentation

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│ Route 53 (DNS)                                               │
│ api.yourdomain.com → ALB                                     │
└──────────────────┬───────────────────────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │ HTTPS Certificate  │
         │ (AWS ACM)          │
         └─────────┬──────────┘
                   │
    ┌──────────────▼──────────────┐
    │  WAF (Web Application Fw)   │
    │  - Rate limiting            │
    │  - OWASP rules              │
    │  - IP reputation            │
    └──────────────┬──────────────┘
                   │
    ┌──────────────▼──────────────────────┐
    │ Application Load Balancer           │
    │ - Sticky sessions (WebSocket)       │
    │ - Health checks                     │
    │ - Multi-AZ                          │
    └──────────────┬──────────────────────┘
                   │
    ┌──────────────┴─────────────────────────────┐
    │ ECS Cluster (Fargate)                      │
    │ 2-10 Backend API Containers                │
    │ - Auto-scaling (CPU/memory)                │
    │ - CloudWatch Logs                          │
    │ - Private subnets (no public IPs)          │
    └──────────────┬─────────────────────────────┘
         ┌─────────┴──────────┬──────────────┐
         │                    │              │
    ┌────▼─────┐     ┌────────▼─────┐  ┌───▼─────┐
    │ DocumentDB│     │ S3 Uploads   │  │ Secrets │
    │ (MongoDB) │     │ (Encrypted)  │  │ Manager │
    │ - KMS enc │     │ - Versioning │  │ (Creds) │
    │ - Backups │     │ - Public     │  │         │
    │ - Multi-AZ│     │   access     │  │         │
    │ - 30 days │     │   blocked    │  │         │
    └────┬─────┘     └──────────────┘  └─────────┘
         │
    ┌────▼──────────────┐
    │ CloudWatch        │
    │ - Metrics         │
    │ - Dashboards      │
    │ - Alarms → SNS    │
    │ - Email alerts    │
    └───────────────────┘
```

---

## Module Structure

```
terraform/
├── backend.tf              # Terraform backend & provider
├── variables.tf            # All input variables
├── main.tf                 # Module orchestration
├── outputs.tf              # Outputs (ALB, bucket, etc.)
│
├── modules/
│   ├── vpc/               # VPC, subnets, NAT, security groups
│   ├── alb/               # Load balancer, listeners, HTTPS
│   ├── ecs/               # Cluster, service, tasks, scaling
│   ├── documentdb/        # MongoDB database with encryption
│   ├── s3/                # Upload bucket with versioning
│   ├── iam/               # Roles and policies
│   ├── secrets/           # Secrets Manager integration
│   ├── waf/               # WAF rules and rate limiting
│   └── monitoring/        # CloudWatch dashboards and alarms
│
├── environments/
│   ├── dev.tfvars        # Development config
│   └── prod.tfvars       # Production config
│
├── README.md             # Comprehensive guide
├── QUICKSTART.md         # Quick reference
├── PRODUCTION_SETUP.md   # Production checklist
└── .gitignore           # Git ignore patterns
```

---

## Next Steps

1. **Read QUICKSTART.md** - Get started in 10 minutes
2. **Read PRODUCTION_SETUP.md** - Configure HTTPS and monitoring
3. **Edit environments/prod.tfvars** - Set your domain and email
4. **Create terraform.tfvars** - Add your API keys (never commit!)
5. **Run terraform apply** - Deploy to AWS

---

## Support & Documentation

- `README.md` - Comprehensive reference
- `QUICKSTART.md` - Common commands
- `PRODUCTION_SETUP.md` - Security & HTTPS setup
- AWS Documentation - ECS, DocumentDB, ALB, WAF

## Common Issues & Solutions

**Certificate validation stuck?**
→ See PRODUCTION_SETUP.md section 11

**ALB returning 502/503?**
→ Check CloudWatch logs and target health

**High database CPU?**
→ Review slow query logs and connection count

---

**Summary:** This infrastructure is production-ready with all essential security, reliability, and monitoring features included. The only thing required is your domain configuration and credentials.
