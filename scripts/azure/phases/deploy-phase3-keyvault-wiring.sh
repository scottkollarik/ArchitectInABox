#!/bin/bash

# Phase 3: Wire Up Key Vault Access to Container Apps
# Usage: ./phases/deploy-phase3-keyvault-wiring.sh [--dry-run]

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

echo "🚀 Phase 3: Wiring Up Key Vault Access"
echo "======================================"

# Load environment and check prerequisites
check_azure_cli
load_environment

# Check Phase 2 dependency
if ! is_phase_completed "phase2_infrastructure"; then
    echo "❌ Phase 2 (infrastructure) must be completed first"
    echo "💡 Run: ./phases/deploy-phase2-infrastructure.sh"
    exit 1
fi

# Required variables from environment
RG_NAME="$AZURE_RESOURCE_GROUP"
NAME_PREFIX="$APP_SHORT_NAME"
KV_NAME="$GLOBAL_KEY_VAULT_NAME"
KV_RG="$GLOBAL_KEY_VAULT_RG"

echo "📍 Target: $RG_NAME"
echo "🔐 Key Vault: $KV_NAME in $KV_RG"

# Update status
if [[ "$DRY_RUN" == "false" ]]; then
    update_phase_status "phase3_key_vault_wiring" "in_progress"
fi

# Get identity principal IDs
echo "🔍 Getting identity information..."
BACKEND_IDENTITY_JSON=$(az identity show --resource-group "$RG_NAME" --name "${NAME_PREFIX}-backend-identity" --output json)
FRONTEND_IDENTITY_JSON=$(az identity show --resource-group "$RG_NAME" --name "${NAME_PREFIX}-frontend-identity" --output json)

BACKEND_PRINCIPAL_ID=$(echo "$BACKEND_IDENTITY_JSON" | jq -r '.principalId')
FRONTEND_PRINCIPAL_ID=$(echo "$FRONTEND_IDENTITY_JSON" | jq -r '.principalId')
BACKEND_IDENTITY_ID=$(echo "$BACKEND_IDENTITY_JSON" | jq -r '.id')
FRONTEND_IDENTITY_ID=$(echo "$FRONTEND_IDENTITY_JSON" | jq -r '.id')

echo "   Backend Principal ID: $BACKEND_PRINCIPAL_ID"
echo "   Backend Identity ID: $BACKEND_IDENTITY_ID"
echo "   Frontend Principal ID: $FRONTEND_PRINCIPAL_ID"
echo "   Frontend Identity ID: $FRONTEND_IDENTITY_ID"

# Perform comprehensive Key Vault integration verification
echo "🔍 Performing comprehensive Key Vault integration verification..."

KV_SCOPE="/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$KV_RG/providers/Microsoft.KeyVault/vaults/$KV_NAME"
KV_URI=$(az keyvault show --name "$KV_NAME" --resource-group "$KV_RG" --query properties.vaultUri -o tsv)

ensure_kv_role_assignment() {
    local PRINCIPAL_ID="$1"
    local DESCRIPTION="$2"

    local ASSIGNMENT_COUNT
    ASSIGNMENT_COUNT=$(az role assignment list \
        --assignee "$PRINCIPAL_ID" \
        --scope "$KV_SCOPE" \
        --role "Key Vault Secrets User" \
        --query length -o tsv)

    if [[ "$ASSIGNMENT_COUNT" == "0" || -z "$ASSIGNMENT_COUNT" ]]; then
        echo "   Granting Key Vault Secrets User role to $DESCRIPTION..."
        az role assignment create \
            --assignee-object-id "$PRINCIPAL_ID" \
            --assignee-principal-type ServicePrincipal \
            --scope "$KV_SCOPE" \
            --role "Key Vault Secrets User" \
            --output none
    else
        echo "   ✅ Key Vault role assignment already exists for $DESCRIPTION"
    fi
}

# Verify Key Vault integration for backend Container App
BACKEND_APP="${NAME_PREFIX}-backend"
set +e
verify_keyvault_integration_complete "$BACKEND_APP" "$RG_NAME" "$BACKEND_PRINCIPAL_ID" "$KV_NAME" "$KV_RG"
BACKEND_KV_STATE=$?

# Verify Key Vault integration for frontend Container App
FRONTEND_APP="${NAME_PREFIX}-frontend"
verify_keyvault_integration_complete "$FRONTEND_APP" "$RG_NAME" "$FRONTEND_PRINCIPAL_ID" "$KV_NAME" "$KV_RG"
FRONTEND_KV_STATE=$?
set -e

# Determine what needs to be configured
KV_INTEGRATION_ISSUES=()

if [[ $BACKEND_KV_STATE -ne 0 ]]; then
    KV_INTEGRATION_ISSUES+=("Backend Container App Key Vault integration")
fi

if [[ $FRONTEND_KV_STATE -ne 0 ]]; then
    KV_INTEGRATION_ISSUES+=("Frontend Container App Key Vault integration")
fi

if [[ ${#KV_INTEGRATION_ISSUES[@]} -eq 0 ]]; then
    echo "✅ All Key Vault integrations are complete and working"
    KV_INTEGRATION_NEEDS_CONFIGURATION=false
else
    echo "🔄 Key Vault integration components need configuration:"
    for issue in "${KV_INTEGRATION_ISSUES[@]}"; do
        echo "   - $issue"
    done
    KV_INTEGRATION_NEEDS_CONFIGURATION=true
fi

# Configure Key Vault integration if needed
if [[ "$KV_INTEGRATION_NEEDS_CONFIGURATION" == "true" ]]; then
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "🔍 [DRY RUN] Would configure Key Vault integration:"
        echo "   - Grant Key Vault Secrets User role to backend/frontend identities"
        echo "   - Configure Container Apps secrets from Key Vault"
        echo "   - Set up registry authentication for private images"
    else
        echo "🔐 Configuring comprehensive Key Vault integration..."

        echo "🔑 Ensuring Key Vault role assignments exist..."
        ensure_kv_role_assignment "$BACKEND_PRINCIPAL_ID" "backend identity"
        ensure_kv_role_assignment "$FRONTEND_PRINCIPAL_ID" "frontend identity"

        echo "✅ Key Vault permissions granted!"

        # Step 2: Configure Container Apps secrets
        echo "🔧 Configuring Container Apps with Key Vault secrets..."

        # Configure backend Container App secrets
        echo "   Configuring backend Container App secrets..."
        EXISTING_SECRETS=$(az containerapp secret list --name "${NAME_PREFIX}-backend" --resource-group "$RG_NAME" --query "[?name=='github-token'].name | length(@)" -o tsv 2>/dev/null || echo "0")

        if [[ "$EXISTING_SECRETS" -eq 0 ]]; then
            az containerapp secret set \
                --name "${NAME_PREFIX}-backend" \
                --resource-group "$RG_NAME" \
                --secrets \
                    github-token=keyvaultref:"${KV_URI}secrets/github-token-aib",identityref:"$BACKEND_IDENTITY_ID" \
                --output table
        else
            echo "   ✅ Backend secrets already configured"
        fi

        # Configure frontend Container App secrets
        echo "   Configuring frontend Container App secrets..."
        EXISTING_SECRETS=$(az containerapp secret list --name "${NAME_PREFIX}-frontend" --resource-group "$RG_NAME" --query "[?name=='github-token'].name | length(@)" -o tsv 2>/dev/null || echo "0")

        if [[ "$EXISTING_SECRETS" -eq 0 ]]; then
            az containerapp secret set \
                --name "${NAME_PREFIX}-frontend" \
                --resource-group "$RG_NAME" \
                --secrets \
                    github-token=keyvaultref:"${KV_URI}secrets/github-token-aib",identityref:"$FRONTEND_IDENTITY_ID" \
                --output table
        else
            echo "   ✅ Frontend secrets already configured"
        fi

        echo "🔧 Ensuring Container App registry configuration..."
        GITHUB_TOKEN_VALUE=$(az keyvault secret show \
            --vault-name "$KV_NAME" \
            --name "github-token-aib" \
            --query value -o tsv)

        az containerapp registry set \
            --name "${NAME_PREFIX}-backend" \
            --resource-group "$RG_NAME" \
            --server "ghcr.io" \
            --username "scottkollarik" \
            --password "$GITHUB_TOKEN_VALUE" \
            --output none

        az containerapp registry set \
            --name "${NAME_PREFIX}-frontend" \
            --resource-group "$RG_NAME" \
            --server "ghcr.io" \
            --username "scottkollarik" \
            --password "$GITHUB_TOKEN_VALUE" \
            --output none

        unset GITHUB_TOKEN_VALUE

        echo "🔍 Re-verifying Key Vault integration after configuration..."
        set +e
        verify_keyvault_integration_complete "$BACKEND_APP" "$RG_NAME" "$BACKEND_PRINCIPAL_ID" "$KV_NAME" "$KV_RG"
        BACKEND_KV_VERIFY=$?
        verify_keyvault_integration_complete "$FRONTEND_APP" "$RG_NAME" "$FRONTEND_PRINCIPAL_ID" "$KV_NAME" "$KV_RG"
        FRONTEND_KV_VERIFY=$?
        set -e

        if [[ $BACKEND_KV_VERIFY -ne 0 || $FRONTEND_KV_VERIFY -ne 0 ]]; then
            echo "❌ Key Vault integration still has issues after configuration"
            exit 1
        fi

        echo "✅ Container Apps Key Vault integration configured!"
    fi
else
    echo "✅ All Key Vault integrations are complete and working, skipping configuration"
fi

# Mark phase as completed
if [[ "$DRY_RUN" == "false" ]]; then
    update_phase_status "phase3_key_vault_wiring" "completed"
fi

echo "✅ Phase 3 completed successfully!"
echo "🚀 Next: Run Phase 4 to deploy applications with private images"
