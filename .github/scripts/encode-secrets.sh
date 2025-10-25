#!/bin/bash

# Helper script to encode terraform.tfvars for GitHub Secrets
# Usage: ./scripts/encode-secrets.sh terraform/environments/prod.tfvars

set -e

if [ $# -ne 1 ]; then
    echo "Usage: $0 <path-to-tfvars-file>"
    echo "Example: $0 terraform/environments/prod.tfvars"
    exit 1
fi

TFVARS_FILE="$1"

if [ ! -f "$TFVARS_FILE" ]; then
    echo "Error: File not found: $TFVARS_FILE"
    exit 1
fi

# Check for sensitive values that shouldn't be in file
if grep -q "sk-" "$TFVARS_FILE" 2>/dev/null; then
    echo "WARNING: File contains OpenAI API key (sk-...)"
    echo "Make sure this is temporary and will be in GitHub Secrets only"
fi

# Encode the file
ENCODED=$(base64 -w 0 < "$TFVARS_FILE")

echo "✓ File encoded successfully"
echo ""
echo "Add this to GitHub Secrets:"
echo "================================================"
echo ""

# Determine which environment
if [[ "$TFVARS_FILE" == *"prod"* ]]; then
    SECRET_NAME="TF_VARS_FILE_PROD"
elif [[ "$TFVARS_FILE" == *"dev"* ]]; then
    SECRET_NAME="TF_VARS_FILE_DEV"
else
    SECRET_NAME="TF_VARS_FILE"
fi

echo "Name:  $SECRET_NAME"
echo "Value:"
echo "$ENCODED"
echo ""
echo "================================================"
echo ""
echo "Steps:"
echo "1. Go to https://github.com/YOUR_ORG/YOUR_REPO/settings/secrets/actions"
echo "2. Click 'New repository secret'"
echo "3. Name: $SECRET_NAME"
echo "4. Value: (paste the encoded value above)"
echo "5. Click 'Add secret'"
echo ""
echo "To verify encoding:"
echo "  echo '$ENCODED' | base64 -d"
