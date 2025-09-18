#!/bin/bash

# Phase 7: Configure Custom Domain for Frontend
# Usage: ./phases/deploy-phase7-custom-domain.sh [--dry-run] <custom-domain>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

source "$SCRIPT_DIR/utils/check-azure-cli.sh"
source "$SCRIPT_DIR/utils/load-environment.sh"
source "$SCRIPT_DIR/utils/deployment-status.sh"

DRY_RUN=false
CUSTOM_DOMAIN=""
DNS_ZONE_NAME=""
DNS_ZONE_RG=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)
            DRY_RUN=true
            shift
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
        *)
            if [[ -z "$CUSTOM_DOMAIN" ]]; then
                CUSTOM_DOMAIN="$1"
            else
                echo "⚠️  Ignoring unexpected argument: $1"
            fi
            shift
            ;;
    esac
done

if [[ -z "$CUSTOM_DOMAIN" ]]; then
    echo "ℹ️  No custom domain provided. Skipping Phase 7."
    exit 0
fi

echo "🚀 Phase 7: Configuring Custom Domain"
echo "====================================="

echo "🌐 Custom Domain: $CUSTOM_DOMAIN"
if [[ -n "$DNS_ZONE_NAME" ]]; then
    echo "🔧 DNS Zone: $DNS_ZONE_NAME (Resource Group: ${DNS_ZONE_RG:-<current>})"
fi

if [[ "$DRY_RUN" == "true" ]]; then
    echo "🔍 DRY RUN MODE: No changes will be made"
fi

check_azure_cli
load_environment

RG_NAME="$AZURE_RESOURCE_GROUP"
NAME_PREFIX="$APP_SHORT_NAME"
FRONTEND_APP="${NAME_PREFIX}-frontend"

if [[ "$DRY_RUN" == "false" ]]; then
    update_phase_status "phase7_custom_domain" "in_progress"
fi

echo "📋 Checking frontend Container App..."
if ! az containerapp show --resource-group "$RG_NAME" --name "$FRONTEND_APP" &>/dev/null; then
    echo "❌ Frontend Container App not found: $FRONTEND_APP"
    echo "💡 Deploy infrastructure (phases 1-4) before configuring the domain."
    exit 1
fi

CURRENT_FQDN=$(az containerapp show \
    --resource-group "$RG_NAME" \
    --name "$FRONTEND_APP" \
    --query "properties.configuration.ingress.fqdn" \
    --output tsv)

echo "🌍 Current FQDN: $CURRENT_FQDN"

echo
if [[ "$DRY_RUN" == "true" ]]; then
    echo "📄 Planned actions:"
    echo "  1. Request managed certificate and hostname binding for $CUSTOM_DOMAIN"
    echo "  2. Output DNS records (CNAME + TXT) required for validation"
    exit 0
fi

MANAGED_CERT_NAME="${NAME_PREFIX}-managed-cert"

echo "🔐 Requesting managed certificate for $CUSTOM_DOMAIN"
ATTEMPTS=0
VALIDATION_INFO=""
while true; do
    set +e
    VALIDATION_INFO=$(az containerapp hostname bind \
        --resource-group "$RG_NAME" \
        --name "$FRONTEND_APP" \
        --hostname "$CUSTOM_DOMAIN" \
        --validation-method CNAME \
        --certificate $MANAGED_CERT_NAME \
        --environment "${NAME_PREFIX}-cae" \
        --output json)
    STATUS=$?
    set -e

    if [[ $STATUS -eq 0 ]]; then
        break
    fi

    ATTEMPTS=$((ATTEMPTS + 1))
    if [[ $ATTEMPTS -ge 6 ]]; then
        echo "❌ Unable to bind hostname after multiple attempts. Ensure DNS records are published and try again."
        exit 1
    fi

    echo "⏳ Validation record not visible yet. Waiting 30 seconds before retry ($ATTEMPTS/6)..."
    sleep 30
done

if [[ -n "$VALIDATION_INFO" ]]; then
    VALIDATION_CNAME=$(echo "$VALIDATION_INFO" | jq -r '.properties.validationTokens | map(select(.type=="CName")) | .[0].token // empty')
    VALIDATION_TXT=$(echo "$VALIDATION_INFO" | jq -r '.properties.validationTokens | map(select(.type=="Txt")) | .[0].token // empty')
else
    echo "⚠️  No validation tokens returned. Check binding output manually."
fi

echo
if [[ -n "$DNS_ZONE_NAME" ]]; then
    if [[ -z "$DNS_ZONE_RG" ]]; then
        DNS_ZONE_RG="$RG_NAME"
    fi
    echo "🛠️  Configuring DNS zone $DNS_ZONE_NAME in $DNS_ZONE_RG"
        az network dns record-set cname set-record \
            --resource-group "$DNS_ZONE_RG" \
            --zone-name "$DNS_ZONE_NAME" \
            --record-set-name "${CUSTOM_DOMAIN%%.*}" \
            --cname "$CURRENT_FQDN" \
            --ttl 300 \
            --output table
    
    if [[ -n "$VALIDATION_CNAME" ]]; then
        az network dns record-set cname set-record \
            --resource-group "$DNS_ZONE_RG" \
            --zone-name "$DNS_ZONE_NAME" \
            --record-set-name "asuid.${CUSTOM_DOMAIN%%.*}" \
            --cname "$VALIDATION_CNAME" \
            --ttl 300 \
            --output table
    elif [[ -n "$VALIDATION_TXT" ]]; then
        az network dns record-set txt add-record \
            --resource-group "$DNS_ZONE_RG" \
            --zone-name "$DNS_ZONE_NAME" \
            --record-set-name "asuid.${CUSTOM_DOMAIN%%.*}" \
            --value "$VALIDATION_TXT" \
            --ttl 300 \
            --output table
    fi
else
    echo "📄 DNS Records to configure:" 
    echo "  CNAME: ${CUSTOM_DOMAIN} -> ${CURRENT_FQDN}"
    if [[ -n "$VALIDATION_CNAME" ]]; then
        echo "  Validation CNAME: asuid.${CUSTOM_DOMAIN} -> ${VALIDATION_CNAME}"
    elif [[ -n "$VALIDATION_TXT" ]]; then
        echo "  Validation TXT: asuid.${CUSTOM_DOMAIN} -> ${VALIDATION_TXT}"
    else
        echo "  (Validation details not returned; verify the bind command output.)"
    fi
fi

echo
echo "✅ Custom domain binding requested. DNS propagation may take several minutes."
echo "   Once DNS is in place, Azure will issue a managed certificate automatically."

if [[ "$DRY_RUN" == "false" ]]; then
    update_phase_status "phase7_custom_domain" "completed"
fi

echo "✅ Phase 7 completed successfully!"
echo "🚀 Your app will be available at https://$CUSTOM_DOMAIN/aib once DNS propagates."
