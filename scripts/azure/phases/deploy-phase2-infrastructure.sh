#!/bin/bash

# Phase 2: Deploy Core Infrastructure with Pre-existing Identities
# Usage: ./phases/deploy-phase2-infrastructure.sh [--dry-run]

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

echo "🚀 Phase 2: Deploying Core Infrastructure"
echo "========================================="

# Load environment and check prerequisites
check_azure_cli
load_environment

# Check Phase 1 dependency
if ! is_phase_completed "phase1_identities"; then
    echo "❌ Phase 1 (identities) must be completed first"
    echo "💡 Run: ./phases/deploy-phase1-identities.sh"
    exit 1
fi

# Required variables from environment
RG_NAME="$AZURE_RESOURCE_GROUP"
LOCATION="$AZURE_LOCATION"
NAME_PREFIX="$APP_SHORT_NAME"

echo "📍 Target: $RG_NAME in $LOCATION"

# Update status
if [[ "$DRY_RUN" == "false" ]]; then
    update_phase_status "phase2_infrastructure" "in_progress"
fi

# Get identity IDs from Phase 1
echo "🔍 Getting identity information from Phase 1..."
BACKEND_IDENTITY_ID=$(az identity show --resource-group "$RG_NAME" --name "${NAME_PREFIX}-backend-identity" --query id -o tsv)
FRONTEND_IDENTITY_ID=$(az identity show --resource-group "$RG_NAME" --name "${NAME_PREFIX}-frontend-identity" --query id -o tsv)

echo "   Backend Identity: $BACKEND_IDENTITY_ID"
echo "   Frontend Identity: $FRONTEND_IDENTITY_ID"

# Perform comprehensive infrastructure state verification
echo "🔍 Performing comprehensive infrastructure state verification..."

# Define resource names
CAE_NAME="${NAME_PREFIX}-cae"
COSMOS_NAME="${NAME_PREFIX}-cosmos"
BACKEND_APP="${NAME_PREFIX}-backend"
FRONTEND_APP="${NAME_PREFIX}-frontend"

# Get storage account name
SA_NAME_PREFIX=$(echo "${NAME_PREFIX}sa" | tr '[:upper:]' '[:lower:]' | tr -d '-')
EXISTING_SA=$(az storage account list --resource-group "$RG_NAME" --query "[?starts_with(name, '$SA_NAME_PREFIX')].name | [0]" -o tsv)

# Verify CosmosDB complete state
set +e
verify_cosmos_complete_state "$COSMOS_NAME" "$RG_NAME"
COSMOS_STATE=$?

# Verify Container Apps complete state
verify_containerapp_complete_state "$BACKEND_APP" "$RG_NAME" "$BACKEND_IDENTITY_ID" ""
BACKEND_APP_STATE=$?

verify_containerapp_complete_state "$FRONTEND_APP" "$RG_NAME" "$FRONTEND_IDENTITY_ID" ""
FRONTEND_APP_STATE=$?
set -e

# Check Container Apps Environment existence (simple check since no complex config)
if az containerapp env show --resource-group "$RG_NAME" --name "$CAE_NAME" &>/dev/null; then
    echo "🔍 Container Apps Environment: $CAE_NAME exists"
    CAE_STATE=0
else
    echo "🔍 Container Apps Environment: $CAE_NAME needs to be created"
    CAE_STATE=1
fi

# Check Storage Account existence
if [[ -n "$EXISTING_SA" ]]; then
    echo "🔍 Storage Account: $EXISTING_SA exists"
    SA_STATE=0
else
    echo "🔍 Storage Account: needs to be created"
    SA_STATE=1
fi

# Determine if infrastructure deployment is needed
INFRASTRUCTURE_ISSUES=()

if [[ $COSMOS_STATE -ne 0 ]]; then
    INFRASTRUCTURE_ISSUES+=("CosmosDB")
fi

if [[ $BACKEND_APP_STATE -ne 0 ]]; then
    INFRASTRUCTURE_ISSUES+=("Backend Container App")
fi

if [[ $FRONTEND_APP_STATE -ne 0 ]]; then
    INFRASTRUCTURE_ISSUES+=("Frontend Container App")
fi

if [[ $CAE_STATE -ne 0 ]]; then
    INFRASTRUCTURE_ISSUES+=("Container Apps Environment")
fi

if [[ $SA_STATE -ne 0 ]]; then
    INFRASTRUCTURE_ISSUES+=("Storage Account")
fi

if [[ ${#INFRASTRUCTURE_ISSUES[@]} -eq 0 ]]; then
    echo "✅ All infrastructure is complete and correctly configured"
    INFRASTRUCTURE_NEEDS_DEPLOYMENT=false
else
    echo "🔄 Infrastructure components need deployment/configuration:"
    for issue in "${INFRASTRUCTURE_ISSUES[@]}"; do
        echo "   - $issue"
    done
    INFRASTRUCTURE_NEEDS_DEPLOYMENT=true
fi

# Deploy infrastructure if needed
if [[ "$INFRASTRUCTURE_NEEDS_DEPLOYMENT" == "true" ]]; then
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "🔍 [DRY RUN] Would deploy Bicep template: infra/azure/templates/phase2-infrastructure.bicep"
        echo "🔍 [DRY RUN] This would create/update infrastructure to ensure correct state"
        echo "🔍 [DRY RUN] Parameters:"
        echo "   namePrefix: $NAME_PREFIX"
        echo "   appShortName: $NAME_PREFIX"
        echo "   location: $LOCATION"
        echo "   backendIdentityId: $BACKEND_IDENTITY_ID"
        echo "   frontendIdentityId: $FRONTEND_IDENTITY_ID"
    else
        echo "🏗️  Deploying infrastructure to ensure correct state..."

        DEPLOYMENT_NAME="phase2-infrastructure-$(date +%Y%m%d-%H%M%S)"

        az deployment group create \
            --resource-group "$RG_NAME" \
            --template-file "infra/azure/templates/phase2-infrastructure.bicep" \
            --parameters \
                namePrefix="$NAME_PREFIX" \
                appShortName="$NAME_PREFIX" \
                location="$LOCATION" \
                backendIdentityId="$BACKEND_IDENTITY_ID" \
                frontendIdentityId="$FRONTEND_IDENTITY_ID" \
            --name "$DEPLOYMENT_NAME" \
            --output table

        echo "📋 Getting deployment outputs..."
        OUTPUTS=$(az deployment group show \
            --resource-group "$RG_NAME" \
            --name "$DEPLOYMENT_NAME" \
            --query 'properties.outputs' \
            --output json)

        echo "🎯 Infrastructure Information:"
        echo "   Storage Account: $(echo "$OUTPUTS" | jq -r '.storageAccountName.value')"
        echo "   CosmosDB Account: $(echo "$OUTPUTS" | jq -r '.cosmosAccountName.value')"
        echo "   Backend URL: https://$(echo "$OUTPUTS" | jq -r '.backendUrl.value')"
        echo "   Frontend URL: https://$(echo "$OUTPUTS" | jq -r '.frontendUrl.value')"

        echo "🔍 Re-verifying infrastructure state after deployment..."
        verify_cosmos_complete_state "$COSMOS_NAME" "$RG_NAME"
        verify_containerapp_complete_state "$BACKEND_APP" "$RG_NAME" "$BACKEND_IDENTITY_ID" ""
        verify_containerapp_complete_state "$FRONTEND_APP" "$RG_NAME" "$FRONTEND_IDENTITY_ID" ""
    fi
else
    echo "✅ All infrastructure is complete and correctly configured, skipping deployment"
fi

# Mark phase as completed
if [[ "$DRY_RUN" == "false" ]]; then
    update_phase_status "phase2_infrastructure" "completed"
fi

echo "✅ Phase 2 completed successfully!"
echo "🚀 Next: Run Phase 3 to wire up Key Vault access"
