#!/bin/bash

# Build and push linux/amd64 container images for Technical Architect Platform
# Usage: ./scripts/build-containers.sh <registry> <tag> [--push|--load]

set -e

REGISTRY=${1:?Registry required (e.g., mydocker, ghcr.io/username)}
TAG=${2:-latest}
OUTPUT_FLAG=${3:---push}
PLATFORM=${PLATFORM:-linux/amd64}

if [[ "$OUTPUT_FLAG" != "--push" && "$OUTPUT_FLAG" != "--load" ]]; then
  echo "❌ Third argument must be --push or --load (default --push)"
  exit 1
fi

if ! docker buildx ls >/dev/null 2>&1; then
  echo "❌ docker buildx is required. Install via 'docker buildx install' or Docker Desktop 2.0+"
  exit 1
fi

BUILDER_NAME="tap-multiarch"
if ! docker buildx inspect "$BUILDER_NAME" >/dev/null 2>&1; then
  echo "🛠️  Creating buildx builder ($BUILDER_NAME)..."
  docker buildx create --name "$BUILDER_NAME" --use >/dev/null
else
  docker buildx use "$BUILDER_NAME" >/dev/null
fi

echo "🐳 Building container images for Technical Architect Platform"
echo "Registry: $REGISTRY"
echo "Tag: $TAG"
echo "Platform: $PLATFORM"
echo "Output mode: $OUTPUT_FLAG"
echo

# Determine build output flag
if [[ "$OUTPUT_FLAG" == "--push" ]]; then
  BACKEND_OUTPUT=(--push)
  FRONTEND_OUTPUT=(--push)
else
  BACKEND_OUTPUT=(--load)
  FRONTEND_OUTPUT=(--load)
fi

# Build backend image
echo "🔧 Building backend image..."
docker buildx build \
  --platform "$PLATFORM" \
  -f backend/Dockerfile \
  -t "${REGISTRY}/tap-backend:${TAG}" \
  backend \
  "${BACKEND_OUTPUT[@]}"
echo "✅ Backend image built: ${REGISTRY}/tap-backend:${TAG}"

# Build frontend image
echo "🌐 Building frontend image..."
docker buildx build \
  --platform "$PLATFORM" \
  -f frontend/Dockerfile \
  --build-arg VITE_API_URL="${VITE_API_URL:-/aib/api}" \
  --build-arg VITE_BASE_PATH="${VITE_BASE_PATH:-/aib}" \
  -t "${REGISTRY}/tap-frontend:${TAG}" \
  frontend \
  "${FRONTEND_OUTPUT[@]}"
echo "✅ Frontend image built: ${REGISTRY}/tap-frontend:${TAG}"

echo
echo "📦 Images built successfully!"
echo "Backend: ${REGISTRY}/tap-backend:${TAG}"
echo "Frontend: ${REGISTRY}/tap-frontend:${TAG}"
echo

if [[ "$OUTPUT_FLAG" == "--push" ]]; then
  echo "📤 Images pushed successfully!"
else
  echo "ℹ️  Images loaded into the local docker engine."
fi

echo
echo "🚀 Ready to deploy with:"
echo "  ./scripts/azure/deploy-aib-complete.sh --backend-image ${REGISTRY}/tap-backend:${TAG} --frontend-image ${REGISTRY}/tap-frontend:${TAG}"
