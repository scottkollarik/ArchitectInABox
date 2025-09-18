#!/bin/bash

# Phase 1: Create User-Assigned Managed Identities
# Usage: ./phases/deploy-phase1-identities.sh [--dry-run]

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

echo "🚀 Phase 1: Creating Managed Identities"
echo "========================================"

# Load environment and check prerequisites
check_azure_cli
load_environment

# Required variables from environment
RG_NAME="$AZURE_RESOURCE_GROUP"
LOCATION="$AZURE_LOCATION"
NAME_PREFIX="$APP_SHORT_NAME"

echo "📍 Target: $RG_NAME in $LOCATION"

# Update status
if [[ "$DRY_RUN" == "false" ]]; then
    update_phase_status "phase1_identities" "in_progress"
fi

# Check comprehensive identity state
BACKEND_IDENTITY_NAME="${NAME_PREFIX}-backend-identity"
FRONTEND_IDENTITY_NAME="${NAME_PREFIX}-frontend-identity"

echo "🔍 Performing comprehensive identity state verification..."

# Helper to wait for identity provisioning to settle
wait_for_identity_ready() {
    local IDENTITY_NAME="$1"
    local RESOURCE_GROUP="$2"
    local ATTEMPTS=0
    local STATUS=0

    while (( ATTEMPTS < 12 )); do
        set +e
        verify_identity_complete_state "$IDENTITY_NAME" "$RESOURCE_GROUP"
        STATUS=$?
        set -e

        if [[ $STATUS -eq 0 ]]; then
            return 0
        fi

        if [[ $STATUS -eq 1 ]]; then
            echo "   ❌ Identity missing after deployment"
            return 1
        fi

        ATTEMPTS=$((ATTEMPTS + 1))
        echo "   ⏳ Identity still provisioning (attempt $ATTEMPTS). Waiting 5 seconds..."
        sleep 5
    done

    echo "   ❌ Identity did not reach ready state after waiting"
    return 1
}

# Verify backend identity complete state
set +e
verify_identity_complete_state "$BACKEND_IDENTITY_NAME" "$RG_NAME"
BACKEND_STATE=$?
set -e

# Verify frontend identity complete state
set +e
verify_identity_complete_state "$FRONTEND_IDENTITY_NAME" "$RG_NAME"
FRONTEND_STATE=$?
set -e

# Determine what needs to be done
if [[ $BACKEND_STATE -eq 0 && $FRONTEND_STATE -eq 0 ]]; then
    echo "✅ All identities are complete and correctly configured"
    IDENTITIES_NEED_DEPLOYMENT=false
elif [[ $BACKEND_STATE -eq 1 || $FRONTEND_STATE -eq 1 ]]; then
    echo "🆕 Some identities are missing and need to be created"
    IDENTITIES_NEED_DEPLOYMENT=true
else
    echo "⚠️  Some identities exist but may have configuration issues"
    echo "🔄 Will proceed with deployment to ensure correct state"
    IDENTITIES_NEED_DEPLOYMENT=true
fi

# Deploy identities if needed
if [[ "$IDENTITIES_NEED_DEPLOYMENT" == "true" ]]; then
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "🔍 [DRY RUN] Would deploy Bicep template: infra/azure/templates/phase1-identities.bicep"
        echo "🔍 [DRY RUN] This would create/update identities to ensure correct state"
    else
        echo "🏗️  Deploying managed identities to ensure correct state..."

        DEPLOYMENT_NAME="phase1-identities-$(date +%Y%m%d-%H%M%S)"

        az deployment group create \
            --resource-group "$RG_NAME" \
            --template-file "infra/azure/templates/phase1-identities.bicep" \
            --parameters \
                namePrefix="$NAME_PREFIX" \
                location="$LOCATION" \
            --name "$DEPLOYMENT_NAME" \
            --output table

        echo "🔍 Waiting for identities to reach ready state..."
        wait_for_identity_ready "$BACKEND_IDENTITY_NAME" "$RG_NAME"
        wait_for_identity_ready "$FRONTEND_IDENTITY_NAME" "$RG_NAME"
    fi
else
    echo "✅ All identities are complete and correctly configured, skipping deployment"
fi

# Get identity information for outputs
if [[ "$DRY_RUN" == "false" ]]; then
    echo "📋 Getting identity information..."

    BACKEND_IDENTITY=$(az identity show --resource-group "$RG_NAME" --name "$BACKEND_IDENTITY_NAME" --output json)
    FRONTEND_IDENTITY=$(az identity show --resource-group "$RG_NAME" --name "$FRONTEND_IDENTITY_NAME" --output json)

    echo "🎯 Identity Information:"
    echo "   Backend Identity ID: $(echo "$BACKEND_IDENTITY" | jq -r '.id')"
    echo "   Backend Principal ID: $(echo "$BACKEND_IDENTITY" | jq -r '.principalId')"
    echo "   Frontend Identity ID: $(echo "$FRONTEND_IDENTITY" | jq -r '.id')"
    echo "   Frontend Principal ID: $(echo "$FRONTEND_IDENTITY" | jq -r '.principalId')"
fi

# Mark phase as completed
if [[ "$DRY_RUN" == "false" ]]; then
    update_phase_status "phase1_identities" "completed"
fi

echo "✅ Phase 1 completed successfully!"
echo "🚀 Next: Run Phase 2 to deploy infrastructure"
