#!/bin/bash

# Enhanced State Verification Utilities
# Provides comprehensive desired-state checking for Azure resources
# Returns: "complete" | "partial" | "missing" | "failed"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verify managed identity complete state
verify_identity_complete_state() {
    local IDENTITY_NAME="$1"
    local RG_NAME="$2"

    echo "🔍 Verifying identity state: $IDENTITY_NAME"

    # Check if identity exists
    if ! az identity show --resource-group "$RG_NAME" --name "$IDENTITY_NAME" &>/dev/null; then
        echo "   ❌ Identity does not exist"
        return 1
    fi

    # Get identity details
    local IDENTITY_JSON=$(az identity show --resource-group "$RG_NAME" --name "$IDENTITY_NAME" --output json)
    local PRINCIPAL_ID=$(echo "$IDENTITY_JSON" | jq -r '.principalId')
    local CLIENT_ID=$(echo "$IDENTITY_JSON" | jq -r '.clientId')
    local PROVISIONING_STATE=$(echo "$IDENTITY_JSON" | jq -r '.properties.provisioningState // "Unknown"')

    # Some API versions omit provisioning state; treat as success when IDs exist
    if [[ "$PROVISIONING_STATE" == "Unknown" ]]; then
        echo "   ℹ️  Provisioning state unavailable; assuming Succeeded when principal ID exists"
        PROVISIONING_STATE="Succeeded"
    fi

    # Verify principal ID is populated (indicates identity is ready)
    if [[ -z "$PRINCIPAL_ID" || "$PRINCIPAL_ID" == "null" ]]; then
        echo "   ⚠️  Identity exists but principal ID not populated"
        return 2
    fi

    # Verify provisioning state
    if [[ "$PROVISIONING_STATE" != "Succeeded" ]]; then
        echo "   ⚠️  Identity provisioning state: $PROVISIONING_STATE"
        return 2
    fi

    echo "   ✅ Identity complete and ready"
    echo "      Principal ID: $PRINCIPAL_ID"
    echo "      Client ID: $CLIENT_ID"
    return 0
}

# Verify Container App complete state
verify_containerapp_complete_state() {
    local APP_NAME="$1"
    local RG_NAME="$2"
    local EXPECTED_IDENTITY_ID="$3"
    local EXPECTED_IMAGE="$4"

    echo "🔍 Verifying Container App state: $APP_NAME"

    # Check if Container App exists
    if ! az containerapp show --resource-group "$RG_NAME" --name "$APP_NAME" &>/dev/null; then
        echo "   ❌ Container App does not exist"
        return 1
    fi

    # Get Container App details
    local APP_JSON=$(az containerapp show --resource-group "$RG_NAME" --name "$APP_NAME" --output json)
    local PROVISIONING_STATE=$(echo "$APP_JSON" | jq -r '.properties.provisioningState')
    local RUNNING_STATE=$(echo "$APP_JSON" | jq -r '.properties.runningStatus // "Unknown"')
    local CURRENT_IMAGE=$(echo "$APP_JSON" | jq -r '.properties.template.containers[0].image')
    local ASSIGNED_IDENTITIES=$(echo "$APP_JSON" | jq -r '.identity.userAssignedIdentities // {} | keys[]' 2>/dev/null)

    local ISSUES=()

    # Check provisioning state
    if [[ "$PROVISIONING_STATE" != "Succeeded" ]]; then
        ISSUES+=("Provisioning state: $PROVISIONING_STATE")
    fi

    # Check if expected identity is assigned (if provided)
    if [[ -n "$EXPECTED_IDENTITY_ID" ]]; then
        if ! echo "$ASSIGNED_IDENTITIES" | grep -q "$EXPECTED_IDENTITY_ID"; then
            ISSUES+=("Expected identity not assigned: $EXPECTED_IDENTITY_ID")
        fi
    fi

    # Check image deployment (if provided)
    if [[ -n "$EXPECTED_IMAGE" && "$CURRENT_IMAGE" != "$EXPECTED_IMAGE" ]]; then
        ISSUES+=("Wrong image deployed: $CURRENT_IMAGE (expected: $EXPECTED_IMAGE)")
    fi

    # Report results
    if [[ ${#ISSUES[@]} -eq 0 ]]; then
        echo "   ✅ Container App complete and correctly configured"
        echo "      Running State: $RUNNING_STATE"
        echo "      Current Image: $CURRENT_IMAGE"
        return 0
    else
        echo "   ⚠️  Container App has configuration issues:"
        for issue in "${ISSUES[@]}"; do
            echo "      - $issue"
        done
        return 2
    fi
}

# Verify CosmosDB complete state
verify_cosmos_complete_state() {
    local COSMOS_NAME="$1"
    local RG_NAME="$2"
    local EXPECTED_CONTAINERS=("projects" "nfrAssessments" "logs")

    echo "🔍 Verifying CosmosDB state: $COSMOS_NAME"

    # Check if CosmosDB account exists
    if ! az cosmosdb show --resource-group "$RG_NAME" --name "$COSMOS_NAME" &>/dev/null; then
        echo "   ❌ CosmosDB account does not exist"
        return 1
    fi

    # Check database exists
    if ! az cosmosdb sql database show --account-name "$COSMOS_NAME" --resource-group "$RG_NAME" --name "tapdb" &>/dev/null; then
        echo "   ❌ Database 'tapdb' does not exist"
        return 2
    fi

    # Check required containers
    local MISSING_CONTAINERS=()
    for container in "${EXPECTED_CONTAINERS[@]}"; do
        if ! az cosmosdb sql container show --account-name "$COSMOS_NAME" --resource-group "$RG_NAME" --database-name "tapdb" --name "$container" &>/dev/null; then
            MISSING_CONTAINERS+=("$container")
        fi
    done

    if [[ ${#MISSING_CONTAINERS[@]} -gt 0 ]]; then
        echo "   ⚠️  Missing containers: ${MISSING_CONTAINERS[*]}"
        return 2
    fi

    echo "   ✅ CosmosDB complete with all required containers"
    return 0
}

# Verify Key Vault integration complete state
verify_keyvault_integration_complete() {
    local APP_NAME="$1"
    local RG_NAME="$2"
    local PRINCIPAL_ID="$3"
    local KV_NAME="$4"
    local KV_RG="$5"

    echo "🔍 Verifying Key Vault integration: $APP_NAME"

    local ISSUES=()

    # Check role assignment exists
    local KV_SCOPE="/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$KV_RG/providers/Microsoft.KeyVault/vaults/$KV_NAME"
    local ROLE_COUNT=$(az role assignment list --assignee "$PRINCIPAL_ID" --scope "$KV_SCOPE" --role "Key Vault Secrets User" --query "length(@)" -o tsv)

    if [[ "$ROLE_COUNT" -eq 0 ]]; then
        ISSUES+=("No Key Vault Secrets User role assignment found")
    fi

    # Check Container App secrets configuration
    local SECRETS_LIST=$(az containerapp secret list --name "$APP_NAME" --resource-group "$RG_NAME" --output json 2>/dev/null)
    if [[ $? -ne 0 ]]; then
        ISSUES+=("Cannot retrieve Container App secrets")
    else
        local GITHUB_TOKEN_SECRET=$(echo "$SECRETS_LIST" | jq -r '.[] | select(.name=="github-token") | .name' 2>/dev/null)
        if [[ -z "$GITHUB_TOKEN_SECRET" || "$GITHUB_TOKEN_SECRET" == "null" ]]; then
            ISSUES+=("github-token secret not configured")
        fi
    fi

    # Check registry configuration
    local REGISTRIES=$(az containerapp show --name "$APP_NAME" --resource-group "$RG_NAME" --query "properties.configuration.registries" --output json 2>/dev/null)
    if [[ "$REGISTRIES" == "null" || "$REGISTRIES" == "[]" ]]; then
        ISSUES+=("No registry authentication configured")
    else
        local GHCR_REGISTRY=$(echo "$REGISTRIES" | jq -r '.[] | select(.server=="ghcr.io") | .server' 2>/dev/null)
        if [[ -z "$GHCR_REGISTRY" || "$GHCR_REGISTRY" == "null" ]]; then
            ISSUES+=("ghcr.io registry not configured")
        fi
    fi

    # Report results
    if [[ ${#ISSUES[@]} -eq 0 ]]; then
        echo "   ✅ Key Vault integration complete and working"
        return 0
    else
        echo "   ⚠️  Key Vault integration has issues:"
        for issue in "${ISSUES[@]}"; do
            echo "      - $issue"
        done
        return 2
    fi
}

# Verify resource permissions complete state
verify_resource_permissions_complete() {
    local PRINCIPAL_ID="$1"
    local RG_NAME="$2"
    local COSMOS_NAME="$3"
    local STORAGE_NAME="$4"

    echo "🔍 Verifying resource permissions for principal: $PRINCIPAL_ID"

    local ISSUES=()

    # Check CosmosDB permissions (if Cosmos name provided)
    if [[ -n "$COSMOS_NAME" ]]; then
        local COSMOS_ASSIGNMENTS=$(az cosmosdb sql role assignment list \
            --account-name "$COSMOS_NAME" \
            --resource-group "$RG_NAME" \
            --query "[?principalId=='$PRINCIPAL_ID'] | length(@)" -o tsv 2>/dev/null)

        if [[ -z "$COSMOS_ASSIGNMENTS" || "$COSMOS_ASSIGNMENTS" -eq 0 ]]; then
            ISSUES+=("No CosmosDB permissions found")
        fi
    fi

    # Check Storage Account permissions
    if [[ -n "$STORAGE_NAME" ]]; then
        local STORAGE_SCOPE=$(az storage account show --name "$STORAGE_NAME" --resource-group "$RG_NAME" --query id -o tsv)
        local STORAGE_ROLES=$(az role assignment list --assignee "$PRINCIPAL_ID" --scope "$STORAGE_SCOPE" --include-inherited --query "length(@)" -o tsv)

        if [[ "$STORAGE_ROLES" -eq 0 ]]; then
            ISSUES+=("No Storage Account permissions found")
        fi
    fi

    # Report results
    if [[ ${#ISSUES[@]} -eq 0 ]]; then
        echo "   ✅ Resource permissions complete"
        return 0
    else
        echo "   ⚠️  Resource permissions have issues:"
        for issue in "${ISSUES[@]}"; do
            echo "      - $issue"
        done
        return 2
    fi
}

# Verify application deployment complete state
verify_application_deployment_complete() {
    local APP_NAME="$1"
    local RG_NAME="$2"
    local EXPECTED_IMAGE="$3"

    echo "🔍 Verifying application deployment: $APP_NAME"

    local ISSUES=()

    # Get current deployment state
    local APP_JSON=$(az containerapp show --resource-group "$RG_NAME" --name "$APP_NAME" --output json 2>/dev/null)
    if [[ $? -ne 0 ]]; then
        echo "   ❌ Cannot retrieve Container App information"
        return 1
    fi

    local CURRENT_IMAGE=$(echo "$APP_JSON" | jq -r '.properties.template.containers[0].image')
    local RUNNING_STATUS=$(echo "$APP_JSON" | jq -r '.properties.runningStatus // "Unknown"')
    local INGRESS_FQDN=$(echo "$APP_JSON" | jq -r '.properties.configuration.ingress.fqdn // ""')

    # Check image deployment
    if [[ -n "$EXPECTED_IMAGE" && "$CURRENT_IMAGE" != "$EXPECTED_IMAGE" ]]; then
        ISSUES+=("Wrong image deployed: $CURRENT_IMAGE (expected: $EXPECTED_IMAGE)")
    fi

    # Check running status
    if [[ "$RUNNING_STATUS" != "Running" && "$RUNNING_STATUS" != "Idle" ]]; then
        ISSUES+=("App not running properly: $RUNNING_STATUS")
    fi

    # Test health endpoint if possible
    if [[ -n "$INGRESS_FQDN" ]]; then
        if ! curl -f -s "https://$INGRESS_FQDN/health" &>/dev/null; then
            ISSUES+=("Health endpoint not responding")
        fi
    fi

    # Report results
    if [[ ${#ISSUES[@]} -eq 0 ]]; then
        echo "   ✅ Application deployment complete and healthy"
        echo "      Current Image: $CURRENT_IMAGE"
        echo "      Status: $RUNNING_STATUS"
        [[ -n "$INGRESS_FQDN" ]] && echo "      URL: https://$INGRESS_FQDN"
        return 0
    else
        echo "   ⚠️  Application deployment has issues:"
        for issue in "${ISSUES[@]}"; do
            echo "      - $issue"
        done
        return 2
    fi
}

# Verify OAuth configuration complete state
verify_oauth_configuration_complete() {
    local FRONTEND_URL="$1"
    local BACKEND_URL="$2"
    local OAUTH_REDIRECT_URI="$3"

    echo "🔍 Verifying OAuth configuration"

    local ISSUES=()

    # Check URL format validity
    if [[ ! "$FRONTEND_URL" =~ ^https:// ]]; then
        ISSUES+=("Frontend URL not HTTPS: $FRONTEND_URL")
    fi

    if [[ ! "$BACKEND_URL" =~ ^https:// ]]; then
        ISSUES+=("Backend URL not HTTPS: $BACKEND_URL")
    fi

    # Check redirect URI format
    if [[ ! "$OAUTH_REDIRECT_URI" =~ ^https://.*auth/callback$ ]]; then
        ISSUES+=("OAuth redirect URI format invalid: $OAUTH_REDIRECT_URI")
    fi

    # Test basic connectivity
    if ! curl -f -s "$FRONTEND_URL" &>/dev/null; then
        ISSUES+=("Frontend URL not accessible")
    fi

    if ! curl -f -s "$BACKEND_URL/health" &>/dev/null; then
        ISSUES+=("Backend health endpoint not accessible")
    fi

    # Report results
    if [[ ${#ISSUES[@]} -eq 0 ]]; then
        echo "   ✅ OAuth configuration appears complete"
        return 0
    else
        echo "   ⚠️  OAuth configuration has issues:"
        for issue in "${ISSUES[@]}"; do
            echo "      - $issue"
        done
        return 2
    fi
}

# Generate comprehensive deployment state report
generate_state_report() {
    local RG_NAME="$1"
    local NAME_PREFIX="$2"

    echo ""
    echo "📊 Comprehensive Deployment State Report"
    echo "========================================"
    echo "Resource Group: $RG_NAME"
    echo "Name Prefix: $NAME_PREFIX"
    echo ""

    # Phase 1: Identities
    echo "Phase 1: Managed Identities"
    verify_identity_complete_state "${NAME_PREFIX}-backend-identity" "$RG_NAME"
    local BACKEND_IDENTITY_STATE=$?
    verify_identity_complete_state "${NAME_PREFIX}-frontend-identity" "$RG_NAME"
    local FRONTEND_IDENTITY_STATE=$?

    # Phase 2: Infrastructure
    echo ""
    echo "Phase 2: Infrastructure"
    verify_cosmos_complete_state "${NAME_PREFIX}-cosmos" "$RG_NAME"
    local COSMOS_STATE=$?

    # Get storage account name
    local SA_NAME=$(az storage account list --resource-group "$RG_NAME" --query "[?starts_with(name, '${NAME_PREFIX}sa')].name | [0]" -o tsv 2>/dev/null)

    if [[ -n "$SA_NAME" ]]; then
        echo "🔍 Storage Account: $SA_NAME exists"
    else
        echo "❌ Storage Account not found"
    fi

    echo ""
    echo "📈 Summary:"
    [[ $BACKEND_IDENTITY_STATE -eq 0 ]] && echo "✅ Backend Identity: Complete" || echo "⚠️  Backend Identity: Issues"
    [[ $FRONTEND_IDENTITY_STATE -eq 0 ]] && echo "✅ Frontend Identity: Complete" || echo "⚠️  Frontend Identity: Issues"
    [[ $COSMOS_STATE -eq 0 ]] && echo "✅ CosmosDB: Complete" || echo "⚠️  CosmosDB: Issues"
    [[ -n "$SA_NAME" ]] && echo "✅ Storage Account: Complete" || echo "⚠️  Storage Account: Issues"
}

# Export functions for use in other scripts
export -f verify_identity_complete_state
export -f verify_containerapp_complete_state
export -f verify_cosmos_complete_state
export -f verify_keyvault_integration_complete
export -f verify_resource_permissions_complete
export -f verify_application_deployment_complete
export -f verify_oauth_configuration_complete
export -f generate_state_report
