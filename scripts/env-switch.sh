#!/bin/bash

# Environment switcher for Technical Architect Platform
# Usage: ./scripts/env-switch.sh <environment>
# Environments: local, development, production, oauth-dev

set -e

ENV=${1:-local}

echo "🔄 Switching to environment: $ENV"

case $ENV in
    "local"|"dev")
        ENV_FILE=".env.local"
        DESCRIPTION="Local development with Docker services"
        ;;
    "development")
        ENV_FILE=".env.development"
        DESCRIPTION="Shared development environment"
        ;;
    "production"|"prod")
        ENV_FILE=".env.production"
        DESCRIPTION="Production environment"
        ;;
    "oauth-dev")
        ENV_FILE=".env.oauth"
        DESCRIPTION="Local development with OAuth"
        ;;
    *)
        echo "❌ Unknown environment: $ENV"
        echo "📋 Available environments:"
        echo "   local       - Local development (Docker, anonymous auth)"
        echo "   development - Shared development environment"
        echo "   oauth-dev   - Local development with OAuth"
        echo "   production  - Production environment"
        exit 1
        ;;
esac

# Check if environment file exists
if [[ ! -f "$ENV_FILE" ]]; then
    echo "❌ Environment file not found: $ENV_FILE"

    case $ENV in
        "production")
            echo "💡 Create from template:"
            echo "   cp .env.production.template .env.production"
            echo "   # Edit with your production values"
            ;;
        "oauth-dev")
            echo "💡 Create OAuth configuration:"
            echo "   ./scripts/azure/setup-entra.sh 'TA Platform Dev' 'http://localhost:5173'"
            ;;
        "local")
            echo "💡 Using default local configuration"
            ENV_FILE=".env.development"
            ;;
    esac

    if [[ ! -f "$ENV_FILE" ]]; then
        exit 1
    fi
fi

echo "📋 Description: $DESCRIPTION"
echo "📁 Source file: $ENV_FILE"

# Create symbolic links or copy files
echo "🔗 Setting up environment files..."

# Root .env file
if [[ -L ".env" ]] || [[ -f ".env" ]]; then
    rm -f ".env"
fi
ln -sf "$ENV_FILE" ".env"
echo "   ✅ Root .env -> $ENV_FILE"

# Frontend .env file
FRONTEND_ENV="frontend/.env"
if [[ -L "$FRONTEND_ENV" ]] || [[ -f "$FRONTEND_ENV" ]]; then
    rm -f "$FRONTEND_ENV"
fi
ln -sf "../$ENV_FILE" "$FRONTEND_ENV"
echo "   ✅ frontend/.env -> ../$ENV_FILE"

# Backend .env file
BACKEND_ENV="backend/.env"
if [[ -L "$BACKEND_ENV" ]] || [[ -f "$BACKEND_ENV" ]]; then
    rm -f "$BACKEND_ENV"
fi
ln -sf "../$ENV_FILE" "$BACKEND_ENV"
echo "   ✅ backend/.env -> ../$ENV_FILE"

echo
echo "✅ Environment switched to: $ENV"
echo "🏃 Ready to run:"

case $ENV in
    "local"|"development"|"oauth-dev")
        echo "   docker compose up -d    # Start services"
        echo "   cd frontend && npm run dev"
        echo "   cd backend && dotnet run"
        ;;
    "production")
        echo "   # Deploy to Azure:"
        echo "   ./scripts/build-containers.sh myregistry latest"
        echo "   ./scripts/azure/deploy.sh my-rg eastus prefix myregistry/tap-backend myregistry/tap-frontend"
        ;;
esac

echo
echo "💡 Current environment variables loaded from: $ENV_FILE"