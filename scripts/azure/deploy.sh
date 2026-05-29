#!/bin/bash

# ⚠️  DEPRECATED: This script has been replaced by the 6-phase deployment system
#
# NEW SYSTEM: Use ./deploy-aib-complete.sh instead
#
# Reason: This script has Key Vault authentication timing issues that have been
# resolved in the new 6-phase system. The new system:
# 1. Creates managed identities first (eliminates chicken-and-egg problem)
# 2. Provides idempotent, resumable deployments
# 3. Better error handling and debugging
#
# Migration:
# OLD: ./scripts/azure/deploy.sh my-rg eastus aib backend:latest frontend:latest
# NEW: ./scripts/azure/deploy-aib-complete.sh --backend-image backend:latest --frontend-image frontend:latest
#
# Archive: This script is preserved in scripts/azure/archive-v1/ for reference
#
# Deploy Technical Architect Platform to Azure (DEPRECATED)
# Usage: ./scripts/azure/deploy.sh <resource-group> <location> <name-prefix> <backend-image> <frontend-image> [enable-search] [env-file]

set -e

RG_NAME=${1:?Resource group name required}
LOCATION=${2:?Location required}
NAME_PREFIX=${3:?Name prefix required}
BACKEND_IMAGE=${4:?Backend image required}
FRONTEND_IMAGE=${5:?Frontend image required}
ENABLE_SEARCH=${6:-false}
ENV_FILE=${7:-.env.production}

# Check if production environment file exists
if [[ ! -f "$ENV_FILE" ]]; then
    echo "❌ Production environment file not found: $ENV_FILE"
    echo "💡 Create it from template:"
    echo "   cp .env.production.template $ENV_FILE"
    echo "   # Edit $ENV_FILE with your production values"
    exit 1
fi

echo "📋 Loading environment from: $ENV_FILE"
set -a  # automatically export all variables
source "$ENV_FILE"
set +a

echo "🚀 Deploying Technical Architect Platform"
echo "Resource Group: $RG_NAME"
echo "Location: $LOCATION"
echo "Name Prefix: $NAME_PREFIX"
echo "Backend Image: $BACKEND_IMAGE"
echo "Frontend Image: $FRONTEND_IMAGE"
echo "Enable Search: $ENABLE_SEARCH"
echo

# Create resource group if it doesn't exist
echo "📦 Creating resource group..."
az group create --name "$RG_NAME" --location "$LOCATION" --output table

# Deploy infrastructure
echo "🏗️  Deploying infrastructure..."
DEPLOYMENT_NAME="tap-deploy-$(date +%Y%m%d-%H%M%S)"

az deployment group create \
    --resource-group "$RG_NAME" \
    --template-file infra/azure/main.bicep \
    --parameters \
        namePrefix="$NAME_PREFIX" \
        appShortName="$APP_SHORT_NAME" \
        location="$LOCATION" \
        backendImage="$BACKEND_IMAGE" \
        frontendImage="$FRONTEND_IMAGE" \
        enableSearch="$ENABLE_SEARCH" \
        customDomain="${CUSTOM_DOMAIN:-}" \
    --name "$DEPLOYMENT_NAME" \
    --output table

# Get deployment outputs
echo "📋 Getting deployment outputs..."
OUTPUTS=$(az deployment group show \
    --resource-group "$RG_NAME" \
    --name "$DEPLOYMENT_NAME" \
    --query 'properties.outputs' \
    --output json)

BACKEND_URL=$(echo "$OUTPUTS" | jq -r '.containerAppsBackendUrl.value')
FRONTEND_URL=$(echo "$OUTPUTS" | jq -r '.containerAppsFrontendUrl.value')
STORAGE_ACCOUNT=$(echo "$OUTPUTS" | jq -r '.storageAccountName.value')
COSMOS_ACCOUNT=$(echo "$OUTPUTS" | jq -r '.cosmosAccountName.value')

# Configure Key Vault permissions for Container Apps
echo "🔐 Configuring Key Vault permissions..."

# Get managed identity IDs
BACKEND_IDENTITY=$(az containerapp show --resource-group "$RG_NAME" --name "${NAME_PREFIX}-backend" --query "identity.principalId" -o tsv)
FRONTEND_IDENTITY=$(az containerapp show --resource-group "$RG_NAME" --name "${NAME_PREFIX}-frontend" --query "identity.principalId" -o tsv)

echo "   Backend Identity: $BACKEND_IDENTITY"
echo "   Frontend Identity: $FRONTEND_IDENTITY"

# Grant Key Vault access
echo "   Granting Key Vault permissions..."
az role assignment create \
    --role "Key Vault Secrets User" \
    --assignee "$BACKEND_IDENTITY" \
    --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$GLOBAL_KEY_VAULT_RG/providers/Microsoft.KeyVault/vaults/$GLOBAL_KEY_VAULT_NAME" \
    --output none

az role assignment create \
    --role "Key Vault Secrets User" \
    --assignee "$FRONTEND_IDENTITY" \
    --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$GLOBAL_KEY_VAULT_RG/providers/Microsoft.KeyVault/vaults/$GLOBAL_KEY_VAULT_NAME" \
    --output none

# Restart Container Apps to pick up permissions
echo "   Restarting Container Apps..."
az containerapp revision restart --resource-group "$RG_NAME" --name "${NAME_PREFIX}-backend" --output none
az containerapp revision restart --resource-group "$RG_NAME" --name "${NAME_PREFIX}-frontend" --output none

echo "✅ Key Vault permissions configured!"
echo

echo "✅ Deployment completed!"
echo "🌐 Frontend URL: https://$FRONTEND_URL"
echo "🔧 Backend URL: https://$BACKEND_URL"
echo "💾 Storage Account: $STORAGE_ACCOUNT"
echo "🗄️  Cosmos DB Account: $COSMOS_ACCOUNT"
echo
echo "📝 Save these URLs for your OAuth redirect configuration:"
echo "   - Frontend: https://$FRONTEND_URL"
echo "   - Backend API: https://$BACKEND_URL"
echo

echo
echo "🔐 Next Steps:"
echo "============="
echo "1. Get connection strings from Azure:"
echo "   az cosmosdb keys list --resource-group '$RG_NAME' --name '$COSMOS_ACCOUNT' --type connection-strings"
echo "   az storage account show-connection-string --resource-group '$RG_NAME' --name '$STORAGE_ACCOUNT'"
echo
echo "2. Update your .env.production file with:"
echo "   VITE_API_URL=https://$BACKEND_URL/$NAME_PREFIX/api"
echo "   VITE_OAUTH_REDIRECT_URI=https://$FRONTEND_URL/$NAME_PREFIX/auth/callback"
echo "   ConnectionStrings__CosmosDB=<cosmos-connection-string>"
echo "   ConnectionStrings__AzureBlob=<blob-connection-string>"
echo
echo "3. Configure secrets:"
echo "   ./scripts/azure/configure-secrets.sh '$RG_NAME' '$NAME_PREFIX'"
echo
echo "💡 Your .env.production file is gitignored for security!"
