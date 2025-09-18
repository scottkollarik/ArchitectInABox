#!/bin/bash

# Complete AIB Deployment Script (6 core phases + optional custom domain)
# Usage: ./deploy-aib-complete.sh [options]
# Options:
#   --dry-run                    Show what would be done without making changes
#   --resume-from-phase N        Resume deployment from specific phase (1-7)
#   --backend-image IMAGE        Backend container image (required for phase 4)
#   --frontend-image IMAGE       Frontend container image (required for phase 4)
#   --skip-phase N               Skip specific phase (for testing)
#   --env-file FILE              Environment file (default: .env.production)
#   --custom-domain HOST         Configure custom domain in optional phase 7
#   --dns-zone-name NAME         Azure DNS zone name (optional, for auto-records)
#   --dns-zone-resource-group RG Resource group containing the DNS zone (optional)

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source utilities
source "$SCRIPT_DIR/utils/check-azure-cli.sh"
source "$SCRIPT_DIR/utils/load-environment.sh"
source "$SCRIPT_DIR/utils/deployment-status.sh"
source "$SCRIPT_DIR/utils/state-verification.sh"

# Default values
DRY_RUN=false
RESUME_FROM_PHASE=1
BACKEND_IMAGE=""
FRONTEND_IMAGE=""
SKIP_PHASES=()
ENV_FILE=".env.production"
CUSTOM_DOMAIN=""
DNS_ZONE_NAME=""
DNS_ZONE_RG=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --resume-from-phase)
            RESUME_FROM_PHASE="$2"
            shift 2
            ;;
        --backend-image)
            BACKEND_IMAGE="$2"
            shift 2
            ;;
        --frontend-image)
            FRONTEND_IMAGE="$2"
            shift 2
            ;;
        --skip-phase)
            SKIP_PHASES+=("$2")
            shift 2
            ;;
        --env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        --custom-domain)
            CUSTOM_DOMAIN="$2"
            shift 2
            ;;
        --dns-zone-name)
            DNS_ZONE_NAME="$2"
            shift 2
            ;;
        --dns-zone-resource-group)
            DNS_ZONE_RG="$2"
            shift 2
            ;;
        --help|-h)
            echo "Complete 6-Phase AIB Deployment Script"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --dry-run                    Show what would be done without making changes"
            echo "  --resume-from-phase N        Resume deployment from specific phase (1-6)"
            echo "  --backend-image IMAGE        Backend container image (required for phase 4)"
            echo "  --frontend-image IMAGE       Frontend container image (required for phase 4)"
            echo "  --skip-phase N               Skip specific phase (for testing)"
            echo "  --env-file FILE              Environment file (default: .env.production)"
            echo "  --custom-domain HOST         Configure custom domain in optional phase 7"
            echo "  --dns-zone-name NAME         Azure DNS zone to manage records (optional)"
            echo "  --dns-zone-resource-group RG Resource group for DNS zone (optional)"
            echo "  --help, -h                   Show this help message"
            echo ""
            echo "Example:"
            echo "  $0 --backend-image ghcr.io/user/backend:latest --frontend-image ghcr.io/user/frontend:latest"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Display banner
echo "🚀 AIB Complete Deployment - 6-Phase System"
echo "============================================"

if [[ "$DRY_RUN" == "true" ]]; then
    echo "🔍 DRY RUN MODE: No changes will be made"
fi

echo "📋 Configuration:"
echo "   Environment File: $ENV_FILE"
echo "   Resume From Phase: $RESUME_FROM_PHASE"
if [[ -n "$BACKEND_IMAGE" ]]; then
    echo "   Backend Image: $BACKEND_IMAGE"
fi
if [[ -n "$FRONTEND_IMAGE" ]]; then
    echo "   Frontend Image: $FRONTEND_IMAGE"
fi
if [[ ${#SKIP_PHASES[@]} -gt 0 ]]; then
    echo "   Skip Phases: ${SKIP_PHASES[*]}"
fi
if [[ -n "$CUSTOM_DOMAIN" ]]; then
    echo "   Custom Domain: $CUSTOM_DOMAIN"
    if [[ -n "$DNS_ZONE_NAME" ]]; then
        echo "   DNS Zone: $DNS_ZONE_NAME (${DNS_ZONE_RG:-resource group same as deployment})"
    fi
fi
echo ""

# Load environment and check prerequisites
check_azure_cli
load_environment "$ENV_FILE"

# Initialize deployment status if starting fresh
if [[ "$RESUME_FROM_PHASE" -eq 1 ]]; then
    init_deployment_status "$AZURE_RESOURCE_GROUP"
fi

# Check if deployment status exists
if [[ ! -f "$DEPLOYMENT_STATUS_FILE" ]]; then
    echo "⚠️  No deployment status found. Initializing..."
    init_deployment_status "$AZURE_RESOURCE_GROUP"
fi

echo "📊 Current Deployment Status:"
show_deployment_status
echo ""

# Function to check if phase should be skipped
should_skip_phase() {
    local PHASE="$1"
    for skip_phase in "${SKIP_PHASES[@]}"; do
        if [[ "$skip_phase" == "$PHASE" ]]; then
            return 0
        fi
    done
    return 1
}

# Function to run a phase
run_phase() {
    local PHASE_NUM="$1"
    local PHASE_NAME="$2"
    local PHASE_SCRIPT="$3"
    shift 3
    local PHASE_ARGS=("$@")
    local SANITIZED_NAME=$(echo "$PHASE_NAME" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/_/g' | sed -E 's/^_+//;s/_+$//')
    local PHASE_STATUS_KEY="phase${PHASE_NUM}_${SANITIZED_NAME}"

    echo "🎯 Phase $PHASE_NUM: $PHASE_NAME"
    echo "$(printf '=%.0s' {1..50})"

    if should_skip_phase "$PHASE_NUM"; then
        echo "⏭️  Skipping Phase $PHASE_NUM (--skip-phase $PHASE_NUM specified)"
        return 0
    fi

    if [[ "$PHASE_NUM" -lt "$RESUME_FROM_PHASE" ]]; then
        echo "⏭️  Skipping Phase $PHASE_NUM (resuming from phase $RESUME_FROM_PHASE)"
        return 0
    fi

    if is_phase_completed "$PHASE_STATUS_KEY"; then
        echo "✅ Phase $PHASE_NUM already completed, skipping"
        return 0
    fi

    local PHASE_CMD=("$SCRIPT_DIR/phases/$PHASE_SCRIPT")
    local EXEC_ARGS=("${PHASE_ARGS[@]}")

    if [[ "$DRY_RUN" == "true" ]]; then
        EXEC_ARGS=("--dry-run" "${EXEC_ARGS[@]}")
    fi

    echo "🚀 Running: ${PHASE_CMD[*]} ${EXEC_ARGS[*]}"
    echo ""

    if ! "${PHASE_CMD[@]}" "${EXEC_ARGS[@]}"; then
        echo "❌ Phase $PHASE_NUM failed!"
        update_phase_status "$PHASE_STATUS_KEY" "failed"
        exit 1
    fi

    echo ""
    echo "✅ Phase $PHASE_NUM completed successfully!"
    echo ""
}

# Execute the 6 phases
echo "🚀 Starting 6-Phase Deployment..."
echo ""

# Phase 1: Create Managed Identities
run_phase 1 "Identities" "deploy-phase1-identities.sh"

# Phase 2: Deploy Infrastructure
run_phase 2 "Infrastructure" "deploy-phase2-infrastructure.sh"

# Phase 3: Wire Up Key Vault
run_phase 3 "Key Vault Wiring" "deploy-phase3-keyvault-wiring.sh"

# Phase 4: Deploy Applications (requires images)
if [[ "$RESUME_FROM_PHASE" -le 4 ]] && ! should_skip_phase "4"; then
    if [[ -z "$BACKEND_IMAGE" || -z "$FRONTEND_IMAGE" ]]; then
        echo "❌ Phase 4 requires --backend-image and --frontend-image parameters"
        echo "💡 Example: $0 --backend-image ghcr.io/user/backend:latest --frontend-image ghcr.io/user/frontend:latest"
        exit 1
    fi
fi
run_phase 4 "Applications" "deploy-phase4-applications.sh" "$BACKEND_IMAGE" "$FRONTEND_IMAGE"

# Phase 5: Configure Permissions
run_phase 5 "Permissions" "deploy-phase5-permissions.sh"

# Phase 6: User Access Configuration
run_phase 6 "User Access" "deploy-phase6-user-access.sh"

# Phase 7: Custom Domain (optional)
if [[ -n "$CUSTOM_DOMAIN" ]]; then
    PHASE7_ARGS=("--custom-domain" "$CUSTOM_DOMAIN")
    if [[ -n "$DNS_ZONE_NAME" ]]; then
        PHASE7_ARGS+=("--dns-zone-name" "$DNS_ZONE_NAME")
    fi
    if [[ -n "$DNS_ZONE_RG" ]]; then
        PHASE7_ARGS+=("--dns-zone-resource-group" "$DNS_ZONE_RG")
    fi
    run_phase 7 "Custom Domain" "deploy-phase7-custom-domain.sh" "${PHASE7_ARGS[@]}"
else
    echo "🌐 Skipping Phase 7 (no custom domain configured)"
fi

# Final summary
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================"
echo ""

if [[ "$DRY_RUN" == "false" ]]; then
    # Get final application URLs
    RG_NAME="$AZURE_RESOURCE_GROUP"
    NAME_PREFIX="$APP_SHORT_NAME"

    BACKEND_FQDN=$(az containerapp show --resource-group "$RG_NAME" --name "${NAME_PREFIX}-backend" --query "properties.configuration.ingress.fqdn" -o tsv)
    FRONTEND_FQDN=$(az containerapp show --resource-group "$RG_NAME" --name "${NAME_PREFIX}-frontend" --query "properties.configuration.ingress.fqdn" -o tsv)

    echo "🌐 Your Application URLs:"
    echo "   Frontend: https://$FRONTEND_FQDN"
    echo "   Backend:  https://$BACKEND_FQDN"
    echo "   API:      https://$BACKEND_FQDN/$NAME_PREFIX/api"
    echo ""

    echo "📝 Don't forget to:"
    echo "   1. Update your .env.production with connection strings from Phase 6"
    echo "   2. Run: ./scripts/azure/configure-secrets.sh $RG_NAME $NAME_PREFIX"
    echo "   3. Configure Entra ID OAuth redirect URI"
    echo ""

    # Generate comprehensive deployment state report
    echo ""
    echo "🔍 Generating final deployment state verification report..."
    generate_state_report "$AZURE_RESOURCE_GROUP" "$APP_SHORT_NAME"

    # Clean up deployment status
    rm -f "$DEPLOYMENT_STATUS_FILE"
    echo "🧹 Deployment status cleaned up"
else
    echo "🔍 Dry run completed. Use without --dry-run to execute actual deployment."
    echo "💡 Run with actual parameters to see comprehensive state verification."
fi

echo ""
echo "✨ AIB deployment finished successfully!"
echo ""
echo "📋 To verify your deployment state anytime, you can run:"
echo "   source scripts/azure/utils/state-verification.sh"
echo "   generate_state_report \"$AZURE_RESOURCE_GROUP\" \"$APP_SHORT_NAME\""
