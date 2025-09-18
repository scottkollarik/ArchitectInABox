#!/bin/bash

# Complete end-to-end deployment of Technical Architect Platform
# Usage: ./scripts/full-deploy.sh <resource-group> <location> <name-prefix> [github-registry] [skip-oauth]

set -e

RG_NAME=${1:?Resource group name required}
LOCATION=${2:?Location required}
NAME_PREFIX=${3:?Name prefix required}
GITHUB_REGISTRY=${4:-ghcr.io/scottkollarik}
SKIP_OAUTH=${5:-false}

echo "🚀 FULL DEPLOYMENT: Technical Architect Platform"
echo "=================================="
echo "Resource Group: $RG_NAME"
echo "Location: $LOCATION"
echo "Name Prefix: $NAME_PREFIX"
echo "Registry: $GITHUB_REGISTRY"
echo "Skip OAuth: $SKIP_OAUTH"
echo

# Step 1: Build and push containers
echo "📦 STEP 1: Building and pushing containers..."
./scripts/build-containers.sh "$GITHUB_REGISTRY" latest

if [ $? -ne 0 ]; then
    echo "❌ Container build failed"
    exit 1
fi

# Step 2: Deploy infrastructure
echo "🏗️  STEP 2: Deploying infrastructure..."
./scripts/azure/deploy.sh "$RG_NAME" "$LOCATION" "$NAME_PREFIX" \
    "$GITHUB_REGISTRY/tap-backend:latest" \
    "$GITHUB_REGISTRY/tap-frontend:latest"

if [ $? -ne 0 ]; then
    echo "❌ Infrastructure deployment failed"
    exit 1
fi

# Step 3: Setup Entra ID (OAuth) unless skipped
if [[ "$SKIP_OAUTH" != "true" ]]; then
    echo "🔐 STEP 3: Setting up Entra ID (OAuth)..."

    # Get frontend URL from deployment
    FRONTEND_URL=$(az containerapp show --resource-group "$RG_NAME" --name "${NAME_PREFIX}-frontend" --query "properties.configuration.ingress.fqdn" -o tsv)

    if [[ -n "$FRONTEND_URL" ]]; then
        echo "Frontend URL: https://$FRONTEND_URL"
        ./scripts/azure/setup-entra.sh "Architect in a Box" "https://$FRONTEND_URL"

        if [ $? -eq 0 ]; then
            echo "✅ Entra ID setup completed"
            echo "⚠️  You still need to configure secrets:"
            echo "   ./scripts/azure/configure-secrets.sh $RG_NAME $NAME_PREFIX"
        else
            echo "⚠️  Entra ID setup failed, continuing without OAuth"
        fi
    else
        echo "⚠️  Could not get frontend URL, skipping OAuth setup"
    fi
else
    echo "⏭️  STEP 3: Skipping OAuth setup"
fi

# Summary
echo
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================="

# Get deployment URLs
BACKEND_URL=$(az containerapp show --resource-group "$RG_NAME" --name "${NAME_PREFIX}-backend" --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null || echo "unknown")
FRONTEND_URL=$(az containerapp show --resource-group "$RG_NAME" --name "${NAME_PREFIX}-frontend" --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null || echo "unknown")

echo "🌐 Your Applications:"
echo "   Frontend: https://$FRONTEND_URL"
echo "   Backend:  https://$BACKEND_URL"
echo
echo "💰 Cost When Idle: ~$0 (serverless architecture)"
echo
echo "📋 Next Steps:"
if [[ "$SKIP_OAUTH" != "true" ]]; then
    echo "   1. Configure secrets (if OAuth was set up):"
    echo "      ./scripts/azure/configure-secrets.sh $RG_NAME $NAME_PREFIX"
    echo "   2. Optional: Configure custom domain"
fi
echo "   Test your application at the frontend URL above"
echo
echo "🧹 To teardown (preserve data, ~$0 cost):"
echo "   ./scripts/azure/teardown.sh $RG_NAME $NAME_PREFIX"
echo
echo "🗑️  To teardown (delete everything):"
echo "   ./scripts/azure/teardown.sh $RG_NAME $NAME_PREFIX --full"
echo