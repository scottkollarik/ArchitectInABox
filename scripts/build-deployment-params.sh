#!/bin/bash

# Build Azure deployment parameters from environment configuration
# Usage: ./scripts/build-deployment-params.sh [env-file] [output-file]

set -e

ENV_FILE=${1:-.env.production}
OUTPUT_FILE=${2:-deployment-params.json}
BACKEND_IMAGE=${3:-ghcr.io/scottkollarik/tap-backend:latest}
FRONTEND_IMAGE=${4:-ghcr.io/scottkollarik/tap-frontend:latest}

# Check if environment file exists
if [[ ! -f "$ENV_FILE" ]]; then
    echo "❌ Environment file not found: $ENV_FILE"
    exit 1
fi

echo "📋 Building deployment parameters from: $ENV_FILE"

# Load environment variables
set -a
source "$ENV_FILE"
set +a

# Set Key Vault variables (after sourcing .env file)
GLOBAL_KEY_VAULT_NAME=${5:-${GLOBAL_KEY_VAULT_NAME:?Global Key Vault name required for secure token storage}}
GLOBAL_KEY_VAULT_RG=${6:-${GLOBAL_KEY_VAULT_RG:?Global Key Vault resource group required}}

# Generate Azure ARM parameters file
cat > "$OUTPUT_FILE" << EOF
{
  "\$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "namePrefix": {
      "value": "${APP_SHORT_NAME}"
    },
    "appShortName": {
      "value": "${APP_SHORT_NAME}"
    },
    "location": {
      "value": "${AZURE_LOCATION}"
    },
    "backendImage": {
      "value": "${BACKEND_IMAGE}"
    },
    "frontendImage": {
      "value": "${FRONTEND_IMAGE}"
    },
    "enableSearch": {
      "value": false
    },
    "customDomain": {
      "value": ""
    },
    "globalKeyVaultName": {
      "value": "${GLOBAL_KEY_VAULT_NAME}"
    },
    "globalKeyVaultResourceGroup": {
      "value": "${GLOBAL_KEY_VAULT_RG}"
    }
  }
}
EOF

echo "✅ Parameters file created: $OUTPUT_FILE"
echo "📦 Using images:"
echo "   Backend:  $BACKEND_IMAGE"
echo "   Frontend: $FRONTEND_IMAGE"
echo "🏗️  Configuration:"
echo "   Name Prefix: ${AZURE_NAME_PREFIX:-technologoo}"
echo "   App Short:   ${APP_SHORT_NAME:-aib}"
echo "   Search:      ${ENABLE_SEARCH:-false}"
echo "   Domain:      ${CUSTOM_DOMAIN:-default}"