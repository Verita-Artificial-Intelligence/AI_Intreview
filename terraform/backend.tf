terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "verita-terraform-state-1761384074"
    key            = "verita-ai-interview/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Verita-AI-Interview"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# US East 1 provider for ACM certificates (CloudFront requires certs in us-east-1)
provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "Verita-AI-Interview"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
