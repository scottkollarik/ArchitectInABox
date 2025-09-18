#!/bin/bash
set -e

REGISTRY=${REGISTRY:-ghcr.io/scottkollarik}
TAG=${1:-tap-prod}
if [[ "$TAG" == "tap-prod" ]]; then
  TAG="tap-prod-$(date +%Y%m%d-%H%M%S)"
fi

VITE_BASE_PATH=${VITE_BASE_PATH:-/aib}
VITE_API_URL=${VITE_API_URL:-/aib/api}

VITE_BASE_PATH="$VITE_BASE_PATH" \
VITE_API_URL="$VITE_API_URL" \
  ./scripts/build-containers.sh "$REGISTRY" "$TAG" --push

echo
echo "🚀 Ready to deploy with:"
echo "  ./scripts/redeploy-prod.sh ${TAG}" 
