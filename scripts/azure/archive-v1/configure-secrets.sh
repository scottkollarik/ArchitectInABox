#!/bin/bash

# Configure Azure Container Apps secrets from environment file
# Usage: ./scripts/azure/configure-secrets.sh <resource-group> <name-prefix> [env-file]

set -e

RG_NAME=${1:?Resource group name required}
NAME_PREFIX=${2:?Name prefix required}
ENV_FILE=${3:-.env.production}

if [[ ! -f "$ENV_FILE" ]]; then
    echo "❌ Environment file not found: $ENV_FILE"
    exit 1
fi

echo "🔐 Configuring Container Apps secrets from: $ENV_FILE"

# Load environment variables
set -a
source "$ENV_FILE"
set +a

BACKEND_APP="${NAME_PREFIX}-backend"
FRONTEND_APP="${NAME_PREFIX}-frontend"

echo "📝 Setting backend secrets..."

# Backend secrets
az containerapp secret set \
    --name "$BACKEND_APP" \
    --resource-group "$RG_NAME" \
    --secrets \
        cosmos-connection-string="$ConnectionStrings__CosmosDB" \
        blob-connection-string="$ConnectionStrings__AzureBlob" \
        entra-client-id="$EntraAuth__ClientId" \
        entra-tenant-id="$EntraAuth__TenantId" \
    --output table

echo "🔧 Updating backend environment variables..."

# Update backend environment variables to use secrets
az containerapp update \
    --name "$BACKEND_APP" \
    --resource-group "$RG_NAME" \
    --set-env-vars \
        PathBase="/aib" \
        ASPNETCORE_ENVIRONMENT="Production" \
        "ConnectionStrings__CosmosDB=secretref:cosmos-connection-string" \
        "ConnectionStrings__AzureBlob=secretref:blob-connection-string" \
        "EntraAuth__ClientId=secretref:entra-client-id" \
        "EntraAuth__TenantId=secretref:entra-tenant-id" \
        "EntraAuth__Instance=https://login.microsoftonline.com/" \
    --output table

echo "🌐 Setting frontend secrets..."

# Frontend secrets
az containerapp secret set \
    --name "$FRONTEND_APP" \
    --resource-group "$RG_NAME" \
    --secrets \
        oauth-client-id="$VITE_OAUTH_CLIENT_ID" \
        oauth-tenant-id="$VITE_OAUTH_TENANT_ID" \
    --output table

echo "🔧 Updating frontend environment variables..."

# Update frontend environment variables
az containerapp update \
    --name "$FRONTEND_APP" \
    --resource-group "$RG_NAME" \
    --set-env-vars \
        "VITE_API_URL=$VITE_API_URL" \
        "VITE_AUTH_MODE=oauth" \
        "VITE_BASE_PATH=/aib" \
        "VITE_OAUTH_CLIENT_ID=secretref:oauth-client-id" \
        "VITE_OAUTH_TENANT_ID=secretref:oauth-tenant-id" \
        "VITE_OAUTH_REDIRECT_URI=$VITE_OAUTH_REDIRECT_URI" \
    --output table

echo "✅ Secrets configured successfully!"
echo "🔒 All sensitive data is now stored as Container Apps secrets"
echo "📝 Environment variables reference secrets using 'secretref:' syntax"