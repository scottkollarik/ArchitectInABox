#!/bin/bash

# Utility: Load environment variables from .env files
# Usage: source ./utils/load-environment.sh [env-file]

load_environment() {
    local ENV_FILE=${1:-.env.production}

    if [[ ! -f "$ENV_FILE" ]]; then
        echo "❌ Environment file not found: $ENV_FILE"
        echo "💡 Create it from template:"
        echo "   cp .env.production.template $ENV_FILE"
        echo "   # Edit $ENV_FILE with your values"
        exit 1
    fi

    echo "📋 Loading environment from: $ENV_FILE"

    # Load environment variables
    set -a  # automatically export all variables
    source "$ENV_FILE"
    set +a

    # Validate required variables
    local REQUIRED_VARS=(
        "AZURE_RESOURCE_GROUP"
        "AZURE_LOCATION"
        "APP_SHORT_NAME"
        "GLOBAL_KEY_VAULT_NAME"
        "GLOBAL_KEY_VAULT_RG"
    )

    for var in "${REQUIRED_VARS[@]}"; do
        if [[ -z "${!var}" ]]; then
            echo "❌ Required environment variable not set: $var"
            echo "💡 Check your $ENV_FILE file"
            exit 1
        fi
    done

    echo "✅ Environment loaded successfully"
    echo "   Resource Group: $AZURE_RESOURCE_GROUP"
    echo "   Location: $AZURE_LOCATION"
    echo "   App Short Name: $APP_SHORT_NAME"
}

# Export the function for use in other scripts
export -f load_environment