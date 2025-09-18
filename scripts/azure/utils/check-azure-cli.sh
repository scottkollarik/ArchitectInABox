#!/bin/bash

# Utility: Check Azure CLI installation and authentication
# Usage: source ./utils/check-azure-cli.sh

check_azure_cli() {
    echo "🔍 Checking Azure CLI..."

    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        echo "❌ Azure CLI is not installed"
        echo "💡 Install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi

    # Check if logged in
    if ! az account show &> /dev/null; then
        echo "❌ Not logged in to Azure CLI"
        echo "💡 Run: az login"
        exit 1
    fi

    # Display current subscription
    SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
    SUBSCRIPTION_ID=$(az account show --query id -o tsv)
    echo "✅ Azure CLI ready"
    echo "   Subscription: $SUBSCRIPTION_NAME ($SUBSCRIPTION_ID)"
}

# Export the function for use in other scripts
export -f check_azure_cli