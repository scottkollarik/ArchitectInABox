#!/bin/bash

# Phase 4: Deploy Applications with Private Container Images
# Usage: ./phases/deploy-phase4-applications.sh <backend-image> <frontend-image> [--dry-run]

set -e

# Get script directory for relative imports
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Source utilities
source "$SCRIPT_DIR/utils/check-azure-cli.sh"
source "$SCRIPT_DIR/utils/load-environment.sh"
source "$SCRIPT_DIR/utils/deployment-status.sh"
source "$SCRIPT_DIR/utils/state-verification.sh"

# Parse arguments
BACKEND_IMAGE="$1"
FRONTEND_IMAGE="$2"
DRY_RUN=false

if [[ "$3" == "--dry-run" || "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "🔍 DRY RUN MODE: No changes will be made"
fi

if [[ -z "$BACKEND_IMAGE" || -z "$FRONTEND_IMAGE" ]] && [[ "$DRY_RUN" == "false" ]]; then
    echo "❌ Usage: $0 <backend-image> <frontend-image> [--dry-run]"
    echo "💡 Example: $0 ghcr.io/scottkollarik/tap-backend:latest ghcr.io/scottkollarik/tap-frontend:latest"
    exit 1
fi

echo "🚀 Phase 4: Deploying Applications with Private Images"
echo "====================================================="

# Load environment and check prerequisites
check_azure_cli
load_environment

# Check Phase 3 dependency
if ! is_phase_completed "phase3_key_vault_wiring"; then
    echo "❌ Phase 3 (keyvault wiring) must be completed first"
    echo "💡 Run: ./phases/deploy-phase3-keyvault-wiring.sh"
    exit 1
fi

# Required variables from environment
RG_NAME="$AZURE_RESOURCE_GROUP"
NAME_PREFIX="$APP_SHORT_NAME"

echo "📍 Target: $RG_NAME"
if [[ "$DRY_RUN" == "false" ]]; then
    echo "🐳 Backend Image: $BACKEND_IMAGE"
    echo "🐳 Frontend Image: $FRONTEND_IMAGE"
fi

# Update status
if [[ "$DRY_RUN" == "false" ]]; then
    update_phase_status "phase4_applications" "in_progress"
fi

# Perform comprehensive application deployment verification
echo "🔍 Performing comprehensive application deployment verification..."

BACKEND_APP="${NAME_PREFIX}-backend"
FRONTEND_APP="${NAME_PREFIX}-frontend"

# Verify backend application deployment state
if [[ -n "$BACKEND_IMAGE" ]]; then
    set +e
    verify_application_deployment_complete "$BACKEND_APP" "$RG_NAME" "$BACKEND_IMAGE"
    BACKEND_APP_STATE=$?
    set -e
else
    # If no target image specified, just check if app exists and is healthy
    set +e
    verify_application_deployment_complete "$BACKEND_APP" "$RG_NAME" ""
    BACKEND_APP_STATE=$?
    set -e
fi

# Verify frontend application deployment state
if [[ -n "$FRONTEND_IMAGE" ]]; then
    set +e
    verify_application_deployment_complete "$FRONTEND_APP" "$RG_NAME" "$FRONTEND_IMAGE"
    FRONTEND_APP_STATE=$?
    set -e
else
    # If no target image specified, just check if app exists and is healthy
    set +e
    verify_application_deployment_complete "$FRONTEND_APP" "$RG_NAME" ""
    FRONTEND_APP_STATE=$?
    set -e
fi

# Determine what needs to be deployed
APPLICATION_DEPLOYMENT_ISSUES=()

if [[ $BACKEND_APP_STATE -ne 0 ]]; then
    APPLICATION_DEPLOYMENT_ISSUES+=("Backend application deployment")
fi

if [[ $FRONTEND_APP_STATE -ne 0 ]]; then
    APPLICATION_DEPLOYMENT_ISSUES+=("Frontend application deployment")
fi

if [[ ${#APPLICATION_DEPLOYMENT_ISSUES[@]} -eq 0 ]]; then
    echo "✅ All applications are deployed correctly and healthy"
    APPLICATION_DEPLOYMENT_NEEDED=false
else
    echo "🔄 Application deployment components need updates:"
    for issue in "${APPLICATION_DEPLOYMENT_ISSUES[@]}"; do
        echo "   - $issue"
    done
    APPLICATION_DEPLOYMENT_NEEDED=true
fi

# Deploy applications if needed
if [[ "$APPLICATION_DEPLOYMENT_NEEDED" == "true" ]]; then
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "🔍 [DRY RUN] Would update Container Apps with private images:"
        echo "   - Backend: $BACKEND_IMAGE"
        echo "   - Frontend: $FRONTEND_IMAGE"
        echo "🔍 [DRY RUN] Would configure registry authentication using Key Vault secrets"
    else
        echo "🚀 Deploying applications with private images..."
        echo "   Target Backend: $BACKEND_IMAGE"
        echo "   Target Frontend: $FRONTEND_IMAGE"

        # Update backend Container App with private registry authentication
        if [[ -n "$BACKEND_IMAGE" ]]; then
            echo "🔄 Updating backend Container App with private image..."
            az containerapp update \
                --name "${NAME_PREFIX}-backend" \
                --resource-group "$RG_NAME" \
                --image "$BACKEND_IMAGE" \
                --output table
            echo "✅ Backend Container App updated!"
        fi

        # Update frontend Container App with private registry authentication
        if [[ -n "$FRONTEND_IMAGE" ]]; then
            echo "🔄 Updating frontend Container App with private image..."
            az containerapp update \
                --name "${NAME_PREFIX}-frontend" \
                --resource-group "$RG_NAME" \
                --image "$FRONTEND_IMAGE" \
                --output table
            echo "✅ Frontend Container App updated!"
        fi

        # Re-verify application deployment after updates
        echo "🔍 Re-verifying application deployment after updates..."
        verify_application_deployment_complete "$BACKEND_APP" "$RG_NAME" "$BACKEND_IMAGE"
        verify_application_deployment_complete "$FRONTEND_APP" "$RG_NAME" "$FRONTEND_IMAGE"

        # Get final URLs
        echo "📋 Getting application URLs..."
        BACKEND_URL=$(az containerapp show --resource-group "$RG_NAME" --name "${NAME_PREFIX}-backend" --query "properties.configuration.ingress.fqdn" -o tsv)
        FRONTEND_URL=$(az containerapp show --resource-group "$RG_NAME" --name "${NAME_PREFIX}-frontend" --query "properties.configuration.ingress.fqdn" -o tsv)

        echo "🎯 Application Information:"
        echo "   Backend URL: https://$BACKEND_URL"
        echo "   Frontend URL: https://$FRONTEND_URL"
        echo "   API Base URL: https://$BACKEND_URL/$NAME_PREFIX/api"
    fi
else
    echo "✅ All applications are deployed correctly and healthy, skipping deployment"
fi

# Mark phase as completed
if [[ "$DRY_RUN" == "false" ]]; then
    update_phase_status "phase4_applications" "completed"
fi

echo "✅ Phase 4 completed successfully!"
echo "🚀 Next: Run Phase 5 to configure resource permissions"
