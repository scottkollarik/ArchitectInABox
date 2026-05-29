#!/bin/bash

# Phase 5: Configure Resource Permissions
# Usage: ./phases/deploy-phase5-permissions.sh [--dry-run]

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

echo "🚀 Phase 5: Configuring Resource Permissions"
echo "============================================"

# Load environment and check prerequisites
check_azure_cli
load_environment

# Check Phase 4 dependency
if ! is_phase_completed "phase4_applications"; then
    echo "❌ Phase 4 (applications) must be completed first"
    echo "💡 Run: ./phases/deploy-phase4-applications.sh"
    exit 1
fi

# Required variables from environment
RG_NAME="$AZURE_RESOURCE_GROUP"
NAME_PREFIX="$APP_SHORT_NAME"

echo "📍 Target: $RG_NAME"

# Update status
if [[ "$DRY_RUN" == "false" ]]; then
    update_phase_status "phase5_permissions" "in_progress"
fi

# Get identity principal IDs
echo "🔍 Getting identity information..."
BACKEND_PRINCIPAL_ID=$(az identity show --resource-group "$RG_NAME" --name "${NAME_PREFIX}-backend-identity" --query principalId -o tsv)
FRONTEND_PRINCIPAL_ID=$(az identity show --resource-group "$RG_NAME" --name "${NAME_PREFIX}-frontend-identity" --query principalId -o tsv)

echo "   Backend Principal ID: $BACKEND_PRINCIPAL_ID"
echo "   Frontend Principal ID: $FRONTEND_PRINCIPAL_ID"

# Perform comprehensive resource permissions verification
echo "🔍 Performing comprehensive resource permissions verification..."

# Get storage account name
SA_NAME=$(az storage account list --resource-group "$RG_NAME" --query "[?starts_with(name, '${NAME_PREFIX}sa')].name | [0]" -o tsv)
COSMOS_NAME="${NAME_PREFIX}-cosmos"

# Verify backend identity resource permissions
set +e
verify_resource_permissions_complete "$BACKEND_PRINCIPAL_ID" "$RG_NAME" "$COSMOS_NAME" "$SA_NAME"
BACKEND_PERMISSIONS_STATE=$?
set -e

# Verify frontend identity resource permissions (mainly storage access)
set +e
verify_resource_permissions_complete "$FRONTEND_PRINCIPAL_ID" "$RG_NAME" "" "$SA_NAME"
FRONTEND_PERMISSIONS_STATE=$?
set -e

# Determine what needs to be configured
PERMISSIONS_ISSUES=()

if [[ $BACKEND_PERMISSIONS_STATE -ne 0 ]]; then
    PERMISSIONS_ISSUES+=("Backend identity resource permissions")
fi

if [[ $FRONTEND_PERMISSIONS_STATE -ne 0 ]]; then
    PERMISSIONS_ISSUES+=("Frontend identity resource permissions")
fi

if [[ ${#PERMISSIONS_ISSUES[@]} -eq 0 ]]; then
    echo "✅ All resource permissions are complete and working"
    PERMISSIONS_NEED_CONFIGURATION=false
else
    echo "🔄 Resource permission components need configuration:"
    for issue in "${PERMISSIONS_ISSUES[@]}"; do
        echo "   - $issue"
    done
    PERMISSIONS_NEED_CONFIGURATION=true
fi

# Configure resource permissions if needed
if [[ "$PERMISSIONS_NEED_CONFIGURATION" == "true" ]]; then
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "🔍 [DRY RUN] Would deploy Bicep template: infra/azure/templates/phase5-permissions.bicep"
        echo "🔍 [DRY RUN] Would grant comprehensive resource permissions:"
        echo "   - CosmosDB access for backend identity"
        echo "   - Storage Account access for backend and frontend identities"
    else
        echo "🔐 Configuring comprehensive resource permissions..."

        DEPLOYMENT_NAME="phase5-permissions-$(date +%Y%m%d-%H%M%S)"

        if [[ -z "$SA_NAME" ]]; then
            echo "❌ Unable to determine storage account name in resource group $RG_NAME"
            exit 1
        fi

        echo "🔐 Granting Cosmos DB access to backend identity..."
        COSMOS_SCOPE="$(az cosmosdb show --name "$COSMOS_NAME" --resource-group "$RG_NAME" --query id -o tsv)"
        az role assignment create \
            --assignee "$BACKEND_PRINCIPAL_ID" \
            --role "Cosmos DB Built-in Data Contributor" \
            --scope "$COSMOS_SCOPE" \
            --output table

        STORAGE_SCOPE="$(az storage account show --name "$SA_NAME" --resource-group "$RG_NAME" --query id -o tsv)"

        echo "🔐 Granting Storage Blob Data Contributor to backend identity..."
        az role assignment create \
            --assignee "$BACKEND_PRINCIPAL_ID" \
            --role "Storage Blob Data Contributor" \
            --scope "$STORAGE_SCOPE" \
            --output table

        echo "🔐 Granting Storage Blob Data Reader to frontend identity..."
        az role assignment create \
            --assignee "$FRONTEND_PRINCIPAL_ID" \
            --role "Storage Blob Data Reader" \
            --scope "$STORAGE_SCOPE" \
            --output table

        echo "🔍 Re-verifying resource permissions after configuration..."
        ATTEMPTS=0
        while true; do
            set +e
            verify_resource_permissions_complete "$BACKEND_PRINCIPAL_ID" "$RG_NAME" "$COSMOS_NAME" "$SA_NAME"
            BACKEND_VERIFY=$?
            verify_resource_permissions_complete "$FRONTEND_PRINCIPAL_ID" "$RG_NAME" "" "$SA_NAME"
            FRONTEND_VERIFY=$?
            set -e

            if [[ $BACKEND_VERIFY -eq 0 && $FRONTEND_VERIFY -eq 0 ]]; then
                echo "✅ Resource permissions configured!"
                break
            fi

            ATTEMPTS=$((ATTEMPTS + 1))
            if [[ $ATTEMPTS -ge 5 ]]; then
                echo "❌ Resource permissions failed to propagate after multiple attempts"
                exit 1
            fi

            echo "⏳ Permissions still propagating... retrying in 10 seconds"
            sleep 10
        done
    fi
else
    echo "✅ All resource permissions are complete and working, skipping configuration"
fi

# Mark phase as completed
if [[ "$DRY_RUN" == "false" ]]; then
    update_phase_status "phase5_permissions" "completed"
fi

echo "✅ Phase 5 completed successfully!"
echo "🚀 Next: Run Phase 6 to configure user access"
