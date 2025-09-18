#!/bin/bash

# Setup Entra ID (Azure AD) Application for Technical Architect Platform
# Usage: ./scripts/azure/setup-entra.sh <app-name> <frontend-url> [backend-url]

set -e

APP_NAME=${1:?Application name required}
FRONTEND_URL=${2:?Frontend URL required (e.g., https://myapp-frontend.azurecontainerapps.io)}
BACKEND_URL=${3:-"${FRONTEND_URL/frontend/backend}"}

echo "🔐 Setting up Entra ID Application"
echo "App Name: $APP_NAME"
echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo

# Check if Azure CLI is logged in
if ! az account show &>/dev/null; then
    echo "❌ Please log in to Azure CLI first: az login"
    exit 1
fi

# Create the application registration
echo "📝 Creating application registration..."
APP_ID=$(az ad app create \
    --display-name "$APP_NAME" \
    --sign-in-audience "AzureADandPersonalMicrosoftAccount" \
    --web-redirect-uris "${FRONTEND_URL}/auth/callback" "${FRONTEND_URL}/" \
    --web-home-page-url "$FRONTEND_URL" \
    --query appId \
    --output tsv)

echo "✅ Application created with ID: $APP_ID"

# Get tenant ID
TENANT_ID=$(az account show --query tenantId --output tsv)

# Configure API permissions (Microsoft Graph)
echo "🔗 Configuring API permissions..."
az ad app permission add \
    --id "$APP_ID" \
    --api "00000003-0000-0000-c000-000000000000" \
    --api-permissions "e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope"

# Configure optional claims
echo "🏷️  Configuring optional claims..."
cat > /tmp/optional-claims.json <<EOF
{
    "idToken": [
        {
            "name": "email",
            "source": null,
            "essential": false,
            "additionalProperties": []
        },
        {
            "name": "given_name",
            "source": null,
            "essential": false,
            "additionalProperties": []
        },
        {
            "name": "family_name",
            "source": null,
            "essential": false,
            "additionalProperties": []
        }
    ],
    "accessToken": [
        {
            "name": "email",
            "source": null,
            "essential": false,
            "additionalProperties": []
        }
    ],
    "saml2Token": []
}
EOF

az ad app update --id "$APP_ID" --optional-claims "@/tmp/optional-claims.json"
rm /tmp/optional-claims.json

# Create service principal
echo "👤 Creating service principal..."
az ad sp create --id "$APP_ID" --output none

echo
echo "✅ Entra ID setup completed!"
echo
echo "📋 Configuration Details:"
echo "========================"
echo "Application ID (Client ID): $APP_ID"
echo "Tenant ID: $TENANT_ID"
echo "Authority: https://login.microsoftonline.com/$TENANT_ID"
echo "Redirect URI: ${FRONTEND_URL}/auth/callback"
echo
echo "🔧 Environment Variables:"
echo "========================"
echo "VITE_OAUTH_CLIENT_ID=$APP_ID"
echo "VITE_OAUTH_TENANT_ID=$TENANT_ID"
echo "VITE_OAUTH_REDIRECT_URI=${FRONTEND_URL}/auth/callback"
echo
echo "📝 Next Steps:"
echo "============="
echo "1. Update your deployment with these environment variables"
echo "2. Redeploy your application with OAuth configuration"
echo "3. Test authentication flow"
echo
echo "💡 For local development, add to .env:"
echo "VITE_OAUTH_CLIENT_ID=$APP_ID"
echo "VITE_OAUTH_TENANT_ID=$TENANT_ID"
echo "VITE_OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback"
echo

# Create local .env file
cat > .env.oauth <<EOF
# OAuth Configuration for Local Development
# Generated: $(date)

VITE_OAUTH_CLIENT_ID=$APP_ID
VITE_OAUTH_TENANT_ID=$TENANT_ID
VITE_OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback

# Production OAuth Configuration
# VITE_OAUTH_REDIRECT_URI=${FRONTEND_URL}/auth/callback
EOF

echo "📄 OAuth configuration saved to .env.oauth"
echo "🔄 Merge this into your .env file for local development"