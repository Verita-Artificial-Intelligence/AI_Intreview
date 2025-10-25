output "dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "zone_id" {
  description = "Zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

output "arn" {
  value = aws_lb.main.arn
}

output "target_group_arn" {
  value = aws_lb_target_group.backend.arn
}

output "target_group_name" {
  value = aws_lb_target_group.backend.name
}

output "security_group_id" {
  value = aws_security_group.alb.id
}

output "certificate_arn" {
  description = "ARN of the ACM certificate (if domain configured)"
  value       = try(aws_acm_certificate.main[0].arn, null)
}

output "certificate_validation_required" {
  description = "Instructions for validating certificate if using custom domain"
  value       = var.domain_name != "" ? "Please add the DNS validation records from ACM to your domain provider. Check AWS ACM console for validation details." : "No certificate configured (HTTP only)"
}
