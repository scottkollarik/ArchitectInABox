#!/bin/bash
set -e

REGISTRY=${REGISTRY:-ghcr.io/scottkollarik}
TAG=${1:-tap-prod}
CUSTOM_DOMAIN=${CUSTOM_DOMAIN:-www.technologoo.com}

./scripts/azure/deploy-aib-complete.sh \
  --resume-from-phase 4 \
  --backend-image "$REGISTRY/tap-backend:$TAG" \
  --frontend-image "$REGISTRY/tap-frontend:$TAG" \
  --custom-domain "$CUSTOM_DOMAIN" \
  --skip-phase 7
