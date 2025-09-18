#!/bin/bash

# Phase 6: Configure User Access and Final Settings
# Usage: ./phases/deploy-phase6-user-access.sh [--dry-run]

set -e

# Get script directory for relative imports
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Source utilities
source "$SCRIPT_DIR/utils/check-azure-cli.sh"
source "$SCRIPT_DIR/utils/load-environment.sh"
source "$SCRIPT_DIR/utils/deployment-status.sh"
source "$SCRIPT_DIR/utils/state-verification.sh"

# Parse arguments
DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "🔍 DRY RUN MODE: No changes will be made"
fi

echo "🚀 Phase 6: Configuring User Access and Final Settings"
echo "======================================================"

# Load environment and check prerequisites
check_azure_cli
load_environment

# Check Phase 5 dependency
if ! is_phase_completed "phase5_permissions"; then
    echo "❌ Phase 5 (permissions) must be completed first"
    echo "💡 Run: ./phases/deploy-phase5-permissions.sh"
    exit 1
fi

# Required variables from environment
RG_NAME="$AZURE_RESOURCE_GROUP"
NAME_PREFIX="$APP_SHORT_NAME"

echo "📍 Target: $RG_NAME"

# Update status
if [[ "$DRY_RUN" == "false" ]]; then
    update_phase_status "phase6_user_access" "in_progress"
fi

# Get application URLs and perform OAuth configuration verification
echo "🔍 Getting application information and verifying OAuth configuration..."
BACKEND_FQDN=$(az containerapp show --resource-group "$RG_NAME" --name "${NAME_PREFIX}-backend" --query "properties.configuration.ingress.fqdn" -o tsv)
FRONTEND_FQDN=$(az containerapp show --resource-group "$RG_NAME" --name "${NAME_PREFIX}-frontend" --query "properties.configuration.ingress.fqdn" -o tsv)

BACKEND_URL="https://$BACKEND_FQDN"
FRONTEND_URL="https://$FRONTEND_FQDN"
API_BASE_URL="$BACKEND_URL/$NAME_PREFIX/api"
OAUTH_REDIRECT_URI="$FRONTEND_URL/$NAME_PREFIX/auth/callback"

echo "🎯 Application URLs:"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend: $BACKEND_URL"
echo "   API Base: $API_BASE_URL"
echo "   OAuth Redirect: $OAUTH_REDIRECT_URI"

# Verify OAuth configuration completeness
verify_oauth_configuration_complete "$FRONTEND_URL" "$BACKEND_URL" "$OAUTH_REDIRECT_URI"
OAUTH_CONFIG_STATE=$?

if [[ $OAUTH_CONFIG_STATE -eq 0 ]]; then
    echo "✅ OAuth configuration appears complete and accessible"
else
    echo "⚠️  OAuth configuration has issues that need attention"
fi

# Get connection strings for environment configuration
echo "📋 Getting connection strings..."

if [[ "$DRY_RUN" == "false" ]]; then
    COSMOS_NAME="${NAME_PREFIX}-cosmos"
    SA_NAME=$(az storage account list --resource-group "$RG_NAME" --query "[?starts_with(name, '${NAME_PREFIX}sa')].name | [0]" -o tsv)

    echo "🔍 Retrieving CosmosDB connection string..."
    COSMOS_CONNECTION=$(az cosmosdb keys list --resource-group "$RG_NAME" --name "$COSMOS_NAME" --type connection-strings --query "connectionStrings[0].connectionString" -o tsv)

    echo "🔍 Retrieving Storage Account connection string..."
    STORAGE_CONNECTION=$(az storage account show-connection-string --resource-group "$RG_NAME" --name "$SA_NAME" --query connectionString -o tsv)

    echo "📝 Environment Configuration Summary"
    echo "=================================="
    echo ""
    echo "Add these values to your .env.production file:"
    echo ""
    echo "# Application URLs"
    echo "VITE_API_URL=$API_BASE_URL"
    echo "VITE_OAUTH_REDIRECT_URI=$OAUTH_REDIRECT_URI"
    echo ""
    echo "# Connection Strings (keep these secure!)"
    echo "ConnectionStrings__CosmosDB=\"$COSMOS_CONNECTION\""
    echo "ConnectionStrings__AzureBlob=\"$STORAGE_CONNECTION\""
    echo ""
    echo "# OAuth Configuration (set these with your Entra ID values)"
    echo "VITE_OAUTH_CLIENT_ID=<your-client-id>"
    echo "VITE_OAUTH_TENANT_ID=<your-tenant-id>"
    echo "EntraAuth__ClientId=<your-client-id>"
    echo "EntraAuth__TenantId=<your-tenant-id>"
    echo ""
else
    echo "🔍 [DRY RUN] Would retrieve connection strings and display configuration summary"
fi

# Display next steps
echo ""
echo "🎯 Next Steps:"
echo "============="
echo ""
echo "1. 📝 Update your .env.production file with the values above"
echo ""
echo "2. 🔐 Configure secrets in Container Apps:"
echo "   ./scripts/azure/configure-secrets.sh $RG_NAME $NAME_PREFIX"
echo ""
echo "3. 🌐 Update Entra ID OAuth redirect URI:"
echo "   - Go to Azure Portal > Entra ID > App Registrations"
echo "   - Select your app registration"
echo "   - Add redirect URI: $OAUTH_REDIRECT_URI"
echo ""
echo "4. 🧪 Test your deployment:"
echo "   curl $BACKEND_URL/$NAME_PREFIX/health"
echo "   # Open browser: $FRONTEND_URL"
echo ""

# Mark phase as completed
if [[ "$DRY_RUN" == "false" ]]; then
    update_phase_status "phase6_user_access" "completed"
fi

echo "✅ Phase 6 completed successfully!"
echo "🎉 All phases completed! Your deployment is ready!"