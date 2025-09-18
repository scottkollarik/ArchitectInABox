#!/bin/bash
set -e

# Optional args: <tag> [--skip-domain]
TAG_INPUT="$1"
SKIP_DOMAIN=""
if [[ "$2" == "--skip-domain" ]]; then
  SKIP_DOMAIN="--skip-phase 7"
fi

TAG=${TAG_INPUT:-tap-prod-$(date +%Y%m%d-%H%M%S)}
REGISTRY=${REGISTRY:-ghcr.io/scottkollarik}
CUSTOM_DOMAIN=${CUSTOM_DOMAIN:-www.technologoo.com}

# Build & push
VITE_BASE_PATH=${VITE_BASE_PATH:-/aib} \
VITE_API_URL=${VITE_API_URL:-/aib/api} \
  ./scripts/build-containers.sh "$REGISTRY" "$TAG" --push

# Nuke prior status so phases re-run cleanly
rm -f .deployment-status

# Redeploy all phases (skip custom domain by default since the portal handles it)
./scripts/azure/deploy-aib-complete.sh \
  --resume-from-phase 1 \
  --backend-image "$REGISTRY/tap-backend:$TAG" \
  --frontend-image "$REGISTRY/tap-frontend:$TAG" \
  --custom-domain "$CUSTOM_DOMAIN" \
  ${SKIP_DOMAIN:- --skip-phase 7}
