output "bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.frontend.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.frontend.arn
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "Hosted zone ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend.hosted_zone_id
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate (if custom domain is used)"
  value       = var.domain_name != "" ? aws_acm_certificate.frontend[0].arn : null
}

output "acm_validation_options" {
  description = "ACM certificate validation DNS records"
  value       = var.domain_name != "" ? aws_acm_certificate.frontend[0].domain_validation_options : []
}

output "website_url" {
  description = "URL of the frontend"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.frontend.domain_name}"
}
