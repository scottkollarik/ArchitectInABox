#!/bin/bash

# Setup Entra ID (Azure AD) Application for Technical Architect Platform
# Usage: ./scripts/azure/setup-entra.sh <app-name> <frontend-url> [backend-url]

set -e

APP_NAME=${1:?Application name required}
FRONTEND_URL_RAW=${2:?Frontend URL required (e.g., https://myapp-frontend.azurecontainerapps.io)}
BASE_PATH=${BASE_PATH:-${VITE_BASE_PATH:-/aib}}

BASE_PATH=${BASE_PATH%/}
if [[ -z "$BASE_PATH" || "$BASE_PATH" == "/" ]]; then
    BASE_PATH=""
elif [[ "$BASE_PATH" != /* ]]; then
    BASE_PATH="/$BASE_PATH"
fi

FRONTEND_URL=${FRONTEND_URL_RAW%/}
if [[ -n "$BASE_PATH" && "$FRONTEND_URL" != *"$BASE_PATH" ]]; then
    FRONTEND_URL="${FRONTEND_URL}${BASE_PATH}"
fi

BACKEND_URL=${3:-"${FRONTEND_URL/frontend/backend}"}

echo "🔐 Setting up Entra ID Application"
echo "App Name: $APP_NAME"
echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo "Base Path: ${BASE_PATH:-/}"
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

# Expose an API scope so the SPA can request backend tokens
echo "🛡️  Exposing API scope for backend access..."
SCOPE_ID=$(uuidgen)
SCOPE_VALUE="user_impersonation"
API_SCOPE="api://${APP_ID}/${SCOPE_VALUE}"

cat > /tmp/oauth2-permission-scopes.json <<EOF
[
  {
    "adminConsentDescription": "Allow the application to access the Technical Architect Platform API on behalf of the signed-in user.",
    "adminConsentDisplayName": "Access Technical Architect Platform API",
    "id": "$SCOPE_ID",
    "isEnabled": true,
    "type": "User",
    "userConsentDescription": "Allow this application to access the Technical Architect Platform API on your behalf.",
    "userConsentDisplayName": "Access Technical Architect Platform API",
    "value": "$SCOPE_VALUE"
  }
]
EOF

az ad app update \
    --id "$APP_ID" \
    --set api.oauth2PermissionScopes=@/tmp/oauth2-permission-scopes.json \
    --set api.requestedAccessTokenVersion=2 >/dev/null

rm /tmp/oauth2-permission-scopes.json

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
echo "VITE_OAUTH_SCOPE=$API_SCOPE"
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
echo "VITE_OAUTH_SCOPE=$API_SCOPE"
echo

# Create local .env file
cat > .env.oauth <<EOF
# OAuth Configuration for Local Development
# Generated: $(date)

VITE_OAUTH_CLIENT_ID=$APP_ID
VITE_OAUTH_TENANT_ID=$TENANT_ID
VITE_OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_OAUTH_SCOPE=$API_SCOPE

# Production OAuth Configuration
# VITE_OAUTH_REDIRECT_URI=${FRONTEND_URL}/auth/callback
# VITE_OAUTH_SCOPE=$API_SCOPE
EOF

echo "📄 OAuth configuration saved to .env.oauth"
echo "🔄 Merge this into your .env file for local development"
