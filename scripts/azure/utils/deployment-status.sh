#!/bin/bash

# Utility: Deployment status tracking
# Usage: source ./utils/deployment-status.sh

DEPLOYMENT_STATUS_FILE=".deployment-status"

# Initialize deployment status
init_deployment_status() {
    local DEPLOYMENT_ID="aib-$(date +%Y%m%d-%H%M%S)"
    local RG_NAME="$1"

    cat > "$DEPLOYMENT_STATUS_FILE" << EOF
{
  "deployment_id": "$DEPLOYMENT_ID",
  "started": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "resource_group": "$RG_NAME",
  "phases": {
    "phase1_identities": "pending",
    "phase2_infrastructure": "pending",
    "phase3_key_vault_wiring": "pending",
    "phase4_applications": "pending",
    "phase5_permissions": "pending",
    "phase6_user_access": "pending",
    "phase7_custom_domain": "pending"
  }
}
EOF

    echo "📝 Initialized deployment status: $DEPLOYMENT_ID"
}

# Update phase status
update_phase_status() {
    local PHASE="$1"
    local STATUS="$2"  # pending, in_progress, completed, failed

    if [[ ! -f "$DEPLOYMENT_STATUS_FILE" ]]; then
        echo "❌ Deployment status file not found. Run init_deployment_status first."
        return 1
    fi

    # Update the JSON file using jq if available, or sed if not
    if command -v jq &> /dev/null; then
        local TEMP_FILE=$(mktemp)
        jq ".phases.${PHASE} = \"$STATUS\"" "$DEPLOYMENT_STATUS_FILE" > "$TEMP_FILE"
        mv "$TEMP_FILE" "$DEPLOYMENT_STATUS_FILE"
    else
        # Fallback to sed (less robust but works without jq)
        sed -i.bak "s/\"${PHASE}\": \"[^\"]*\"/\"${PHASE}\": \"$STATUS\"/" "$DEPLOYMENT_STATUS_FILE"
        rm -f "${DEPLOYMENT_STATUS_FILE}.bak"
    fi

    echo "📊 Phase $PHASE: $STATUS"
}

# Get phase status
get_phase_status() {
    local PHASE="$1"

    if [[ ! -f "$DEPLOYMENT_STATUS_FILE" ]]; then
        echo "pending"
        return
    fi

    if command -v jq &> /dev/null; then
        jq -r ".phases.${PHASE} // \"pending\"" "$DEPLOYMENT_STATUS_FILE"
    else
        grep "\"${PHASE}\":" "$DEPLOYMENT_STATUS_FILE" | cut -d'"' -f4
    fi
}

# Check if phase is completed
is_phase_completed() {
    local PHASE="$1"
    local STATUS=$(get_phase_status "$PHASE")
    [[ "$STATUS" == "completed" ]]
}

# Show deployment status
show_deployment_status() {
    if [[ ! -f "$DEPLOYMENT_STATUS_FILE" ]]; then
        echo "📊 No deployment in progress"
        return
    fi

    echo "📊 Deployment Status:"
    if command -v jq &> /dev/null; then
        jq '.' "$DEPLOYMENT_STATUS_FILE"
    else
        cat "$DEPLOYMENT_STATUS_FILE"
    fi
}

# Export functions for use in other scripts
export -f init_deployment_status
export -f update_phase_status
export -f get_phase_status
export -f is_phase_completed
export -f show_deployment_status
