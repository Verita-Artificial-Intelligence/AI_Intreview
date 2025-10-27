# SES Rollout Checklist

1. **SES setup**: verify `noreply@verita-ai.com` (and staging), request production access, create IAM user + keys.
2. **Terraform vars**: drop real SES creds/branding into `terraform/environments/{dev,prod}.tfvars`, base64 with `./.github/scripts/encode-secrets.sh`, update `TF_VARS_FILE_*` secrets.
3. **Deploy**: run `terraform plan/apply -var-file=environments/dev.tfvars -var-file=secrets.tfvars` (repeat for prod via CI or manual).
4. **Backend check**: ensure ECS task pulls new secret (redeploy if needed) and email send succeeds in logs.
