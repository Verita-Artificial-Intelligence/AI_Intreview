resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
  lower   = true
  numeric = true
}

locals {
  bucket_name = var.bucket_name != "" ? lower(var.bucket_name) : lower("${var.app_name}-uploads-${data.aws_caller_identity.current.account_id}-${random_string.bucket_suffix.result}")
}

data "aws_caller_identity" "current" {}

# S3 Bucket for uploads
resource "aws_s3_bucket" "uploads" {
  bucket = local.bucket_name

  tags = {
    Name = "${var.app_name}-uploads"
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versioning
resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status     = var.enable_versioning ? "Enabled" : "Suspended"
    mfa_delete = "Disabled"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CORS configuration (for browser uploads if needed)
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  count  = var.enable_lifecycle_rules ? 1 : 0
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "delete-temp-files"
    status = "Enabled"

    filter {
      tag {
        key   = "FileType"
        value = "temp"
      }
    }

    expiration {
      days = 7
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }

  rule {
    id     = "cleanup-old-versions"
    status = "Enabled"

    filter {
      tag {
        key   = "FileType"
        value = "final"
      }
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# CloudWatch metric for bucket size
resource "aws_s3_bucket_metric" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  name   = "EntireBucket"
}
