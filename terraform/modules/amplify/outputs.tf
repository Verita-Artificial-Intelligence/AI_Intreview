output "app_id" {
  description = "Amplify App ID"
  value       = aws_amplify_app.frontend.id
}

output "app_arn" {
  description = "Amplify App ARN"
  value       = aws_amplify_app.frontend.arn
}

output "default_domain" {
  description = "Default Amplify domain"
  value       = aws_amplify_app.frontend.default_domain
}

output "production_url" {
  description = "Production branch URL"
  value       = "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.frontend.default_domain}"
}

output "development_url" {
  description = "Development branch URL"
  value       = "https://${aws_amplify_branch.development.branch_name}.${aws_amplify_app.frontend.default_domain}"
}

output "custom_domain" {
  description = "Custom domain (if configured)"
  value       = var.production_domain != "" ? var.production_domain : null
}

output "domain_association_certificate_verification" {
  description = "Certificate verification details for custom domain"
  value       = var.production_domain != "" ? aws_amplify_domain_association.main[0].certificate_verification_dns_record : null
  sensitive   = true
}
