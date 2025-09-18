#!/bin/bash

# Configure custom domain for Azure Container Apps
# Usage: ./scripts/azure/configure-custom-domain.sh <resource-group> <name-prefix> <custom-domain>

set -e

RG_NAME=${1:?Resource group name required}
NAME_PREFIX=${2:?Name prefix required}
CUSTOM_DOMAIN=${3:?Custom domain required (e.g., www.technologoo.com)}

FRONTEND_APP="${NAME_PREFIX}-frontend"
CONTAINER_ENV="${NAME_PREFIX}-cae"

echo "🌐 Configuring custom domain for Container Apps"
echo "Resource Group: $RG_NAME"
echo "Frontend App: $FRONTEND_APP"
echo "Custom Domain: $CUSTOM_DOMAIN"
echo

# Check if the Container App exists
if ! az containerapp show --resource-group "$RG_NAME" --name "$FRONTEND_APP" &>/dev/null; then
    echo "❌ Frontend Container App not found: $FRONTEND_APP"
    echo "💡 Make sure you've deployed the infrastructure first:"
    echo "   ./scripts/azure/deploy.sh $RG_NAME <location> $NAME_PREFIX ..."
    exit 1
fi

echo "📋 Step 1: Get current Container App configuration"
CURRENT_FQDN=$(az containerapp show \
    --resource-group "$RG_NAME" \
    --name "$FRONTEND_APP" \
    --query "properties.configuration.ingress.fqdn" \
    --output tsv)

echo "Current FQDN: $CURRENT_FQDN"

echo
echo "📋 Step 2: Add custom domain to Container Apps Environment"
echo "Adding custom domain: $CUSTOM_DOMAIN"

# Add custom domain to the Container Apps Environment
az containerapp env certificate upload \
    --resource-group "$RG_NAME" \
    --name "$CONTAINER_ENV" \
    --certificate-name "${NAME_PREFIX}-cert" \
    --hostname "$CUSTOM_DOMAIN" \
    --validation-method "CNAME"

echo "✅ Certificate uploaded for domain validation"

echo
echo "📋 Step 3: Update Container App with custom domain"

# Update the Container App to use the custom domain
az containerapp hostname add \
    --resource-group "$RG_NAME" \
    --name "$FRONTEND_APP" \
    --hostname "$CUSTOM_DOMAIN" \
    --certificate "${NAME_PREFIX}-cert"

echo "✅ Custom domain configured!"

echo
echo "🎯 DNS Configuration Required:"
echo "=============================="
echo "Add this CNAME record to your DNS:"
echo
echo "Name:  $(echo $CUSTOM_DOMAIN | cut -d. -f1)"
echo "Type:  CNAME"
echo "Value: $CURRENT_FQDN"
echo "TTL:   300 (or your DNS provider's minimum)"
echo
echo "Example DNS configuration:"
echo "www.technologoo.com  →  CNAME  →  ${CURRENT_FQDN}"
echo

echo "🔐 Certificate Validation:"
echo "=========================="
echo "Azure will automatically:"
echo "1. Validate domain ownership via CNAME"
echo "2. Issue a managed certificate"
echo "3. Configure HTTPS with automatic renewal"
echo

echo "⏳ Next Steps:"
echo "=============="
echo "1. Add the CNAME record to your DNS"
echo "2. Wait 5-15 minutes for DNS propagation"
echo "3. Test your custom domain: https://$CUSTOM_DOMAIN/aib"
echo "4. Update your OAuth redirect URIs to use the custom domain"
echo

echo "🔧 OAuth Update Command:"
echo "az ad app update --id \$VITE_OAUTH_CLIENT_ID --web-redirect-uris \"https://$CUSTOM_DOMAIN/aib/auth/callback\""