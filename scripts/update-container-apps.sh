#!/bin/bash

# Build, tag, push container images and update Azure Container Apps.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ----- Configuration -----
RESOURCE_GROUP=${RESOURCE_GROUP:-rg_aib_prd}
BACKEND_APP_NAME=${BACKEND_APP_NAME:-aib-backend}
FRONTEND_APP_NAME=${FRONTEND_APP_NAME:-aib-frontend}

FRONTEND_REPO=${FRONTEND_REPO:-ghcr.io/scottkollarik/tap-frontend}
BACKEND_REPO=${BACKEND_REPO:-ghcr.io/scottkollarik/tap-backend}

BASE_PATH=${BASE_PATH:-/aib}
API_URL=${API_URL:-https://aib-backend.yellowriver-26644ae4.eastus.azurecontainerapps.io${BASE_PATH}/api}
CLIENT_ID=${CLIENT_ID:-290927ca-209b-42a9-9aa9-98d7a3440be5}
TENANT_ID=${TENANT_ID:-common}
REDIRECT_URI=${REDIRECT_URI:-https://www.technologoo.com${BASE_PATH}/auth/callback}
OAUTH_SCOPE=${OAUTH_SCOPE:-api://${CLIENT_ID}/user_impersonation}

AUDIENCE=${AUDIENCE:-${OAUTH_SCOPE%/*}}

PATH_BASE=${PATH_BASE:-$BASE_PATH}

# ----- Derived tags -----
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%SZ")
COMMIT=$(git rev-parse --short HEAD)

FRONTEND_TAG="${FRONTEND_REPO}:tap-prod-${TIMESTAMP}-${COMMIT}"
BACKEND_TAG="${BACKEND_REPO}:tap-prod-${TIMESTAMP}-${COMMIT}"

echo "📦 Building images"
echo "   Frontend tag: $FRONTEND_TAG"
echo "   Backend tag : $BACKEND_TAG"

# ----- Build images -----
docker buildx build \
  --platform linux/amd64 \
  -f frontend/Dockerfile \
  -t "$FRONTEND_TAG" \
  --build-arg VITE_API_URL="$API_URL" \
  --build-arg VITE_BASE_PATH="$BASE_PATH" \
  --build-arg VITE_OAUTH_CLIENT_ID="$CLIENT_ID" \
  --build-arg VITE_OAUTH_TENANT_ID="$TENANT_ID" \
  --build-arg VITE_OAUTH_REDIRECT_URI="$REDIRECT_URI" \
  --build-arg VITE_OAUTH_SCOPE="$OAUTH_SCOPE" \
  --push \
  frontend

docker buildx build \
  --platform linux/amd64 \
  -f backend/Dockerfile \
  -t "$BACKEND_TAG" \
  --build-arg ASPNET_ENV=Production \
  --push \
  backend

# ----- Update Container Apps -----
echo "🔄 Updating frontend Container App"
az containerapp update \
  --resource-group "$RESOURCE_GROUP" \
  --name "$FRONTEND_APP_NAME" \
  --image "$FRONTEND_TAG" \
  --set-env-vars \
    VITE_OAUTH_CLIENT_ID="$CLIENT_ID" \
    VITE_OAUTH_TENANT_ID="$TENANT_ID" \
    VITE_OAUTH_REDIRECT_URI="$REDIRECT_URI" \
    VITE_OAUTH_SCOPE="$OAUTH_SCOPE" \
    VITE_API_URL="$API_URL" \
    VITE_BASE_PATH="$BASE_PATH"

echo "🔄 Updating backend Container App"
az containerapp update \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP_NAME" \
  --image "$BACKEND_TAG" \
  --set-env-vars \
    ASPNETCORE_ENVIRONMENT=Production \
    PathBase="$PATH_BASE" \
    EntraAuth__ClientId="$CLIENT_ID" \
    EntraAuth__TenantId="$TENANT_ID" \
    EntraAuth__Audience="$AUDIENCE" \
    Database__Backend=cosmosdb \
    Database__Name=tapdb

echo "✅ Deployment complete"
