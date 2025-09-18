#!/bin/bash

# Teardown Technical Architect Platform Azure resources
# Usage: ./scripts/azure/teardown.sh <resource-group> <name-prefix> [--search-only|--full]

set -e

RG_NAME=${1:?Resource group name required}
NAME_PREFIX=${2:?Name prefix required}
MODE=${3:-selective}

echo "🧹 Technical Architect Platform Teardown"
echo "Resource Group: $RG_NAME"
echo "Name Prefix: $NAME_PREFIX"
echo "Mode: $MODE"
echo

if [[ "$MODE" == "--full" ]]; then
    echo "⚠️  FULL TEARDOWN: This will DELETE THE ENTIRE RESOURCE GROUP and ALL DATA!"
    echo "   This action cannot be undone."
    read -p "Type 'DELETE' to confirm: " confirm

    if [[ "$confirm" != "DELETE" ]]; then
        echo "❌ Teardown cancelled"
        exit 1
    fi

    echo "🗑️  Deleting entire resource group..."
    az group delete --name "$RG_NAME" --yes --no-wait
    echo "✅ Resource group deletion initiated (running in background)"

elif [[ "$MODE" == "--search-only" ]]; then
    echo "🎯 SELECTIVE TEARDOWN: Removing only Azure AI Search (if exists)"

    SEARCH_NAME="${NAME_PREFIX}-search"
    if az search service show --resource-group "$RG_NAME" --name "$SEARCH_NAME" &>/dev/null; then
        echo "🔍 Found Azure AI Search service: $SEARCH_NAME"
        az search service delete --resource-group "$RG_NAME" --name "$SEARCH_NAME" --yes
        echo "✅ Azure AI Search deleted"
    else
        echo "ℹ️  No Azure AI Search service found"
    fi

else
    echo "🎯 SELECTIVE TEARDOWN: Preserving data, removing compute resources"
    echo "   Keeping: Storage Account, Cosmos DB (data preserved)"
    echo "   Removing: Container Apps, Container Apps Environment"
    echo

    # Remove Container Apps (they scale to zero anyway, but this stops any minimal logging costs)
    BACKEND_NAME="${NAME_PREFIX}-backend"
    FRONTEND_NAME="${NAME_PREFIX}-frontend"
    CAE_NAME="${NAME_PREFIX}-cae"
    SEARCH_NAME="${NAME_PREFIX}-search"

    echo "📱 Removing container apps..."

    if az containerapp show --resource-group "$RG_NAME" --name "$BACKEND_NAME" &>/dev/null; then
        echo "  🔧 Deleting backend: $BACKEND_NAME"
        az containerapp delete --resource-group "$RG_NAME" --name "$BACKEND_NAME" --yes
    fi

    if az containerapp show --resource-group "$RG_NAME" --name "$FRONTEND_NAME" &>/dev/null; then
        echo "  🌐 Deleting frontend: $FRONTEND_NAME"
        az containerapp delete --resource-group "$RG_NAME" --name "$FRONTEND_NAME" --yes
    fi

    echo "🏗️  Removing container apps environment..."
    if az containerapp env show --resource-group "$RG_NAME" --name "$CAE_NAME" &>/dev/null; then
        echo "  🏗️  Deleting environment: $CAE_NAME"
        az containerapp env delete --resource-group "$RG_NAME" --name "$CAE_NAME" --yes
    fi

    # Remove Azure AI Search if it exists (costs hourly)
    if az search service show --resource-group "$RG_NAME" --name "$SEARCH_NAME" &>/dev/null; then
        echo "  🔍 Deleting Azure AI Search: $SEARCH_NAME"
        az search service delete --resource-group "$RG_NAME" --name "$SEARCH_NAME" --yes
    fi

    echo
    echo "✅ Selective teardown completed!"
    echo "💾 Data preserved in:"
    echo "   - Storage Account: ${NAME_PREFIX}sa*"
    echo "   - Cosmos DB: ${NAME_PREFIX}-cosmos"
    echo
    echo "💰 Cost Impact:"
    echo "   - Storage: ~cents/month for artifacts"
    echo "   - Cosmos DB Serverless: ~$0 when idle"
    echo "   - Container Apps: Removed (was ~$0 when idle)"
    echo
    echo "🚀 To redeploy, run:"
    echo "   ./scripts/azure/deploy.sh $RG_NAME <location> $NAME_PREFIX <backend-image> <frontend-image>"
fi