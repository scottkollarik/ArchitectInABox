# Azure Infrastructure - 6-Phase Deployment System

This directory contains the new 6-phase deployment system that resolves the Key Vault chicken-and-egg authentication problem.

## Directory Structure

```
infra/azure/
├── README.md                          # This file
├── main.bicep                          # Orchestrating template (use scripts instead)
├── archive-v1/                        # Archived old deployment system
│   ├── README.md                       # Why it was archived
│   ├── main.bicep                      # Original monolithic template
│   ├── deploy.sh                       # Original deployment script
│   └── configure-secrets.sh            # Original secrets script
└── templates/                          # Phase-specific Bicep templates
    ├── shared-resources.bicep          # Common variables and parameters
    ├── phase1-identities.bicep         # User-assigned managed identities
    ├── phase2-infrastructure.bicep     # Core Azure resources
    ├── phase3-keyvault-wiring.bicep    # Key Vault permissions
    ├── phase4-applications.bicep       # Application deployment docs
    ├── phase5-permissions.bicep        # Resource access permissions
    └── phase6-user-access.bicep        # User access and OAuth config
```

## The 6-Phase Deployment Process

### **Phase 1: Managed Identities**
- Creates user-assigned managed identities
- These identities exist independently and can be referenced by other resources
- Eliminates the chicken-and-egg problem with Key Vault authentication

### **Phase 2: Infrastructure**
- Deploys Container Apps Environment, Storage Account, CosmosDB
- Creates Container Apps with placeholder images and pre-assigned identities
- No Key Vault dependencies yet

### **Phase 3: Key Vault Wiring**
- Grants the pre-existing managed identities access to the global Key Vault
- Configures Container Apps to reference Key Vault secrets
- Now Container Apps can authenticate to private registries

### **Phase 4: Applications**
- Updates Container Apps to use private container images
- Configures registry authentication using Key Vault secrets
- Deploys the actual application code

### **Phase 5: Resource Permissions**
- Grants managed identities access to CosmosDB and Storage Account
- Configures all cross-resource permissions

### **Phase 6: User Access Configuration**
- Configures OAuth settings and redirect URIs
- Sets up final user access policies
- Provides deployment summary and next steps

## How to Deploy

### **Recommended: Use the Script-Based Approach**

```bash
# Complete deployment with all phases
./scripts/azure/deploy-aib-complete.sh \
  --backend-image ghcr.io/your-org/backend:latest \
  --frontend-image ghcr.io/your-org/frontend:latest

# Dry run to see what would happen
./scripts/azure/deploy-aib-complete.sh --dry-run

# Resume from a specific phase
./scripts/azure/deploy-aib-complete.sh --resume-from-phase 3

# Skip a specific phase (for testing)
./scripts/azure/deploy-aib-complete.sh --skip-phase 4
```

### **Alternative: Manual Phase Execution**

```bash
# Phase 1: Create identities
./scripts/azure/phases/deploy-phase1-identities.sh

# Phase 2: Deploy infrastructure
./scripts/azure/phases/deploy-phase2-infrastructure.sh

# Phase 3: Wire up Key Vault
./scripts/azure/phases/deploy-phase3-keyvault-wiring.sh

# Phase 4: Deploy applications
./scripts/azure/phases/deploy-phase4-applications.sh \
  ghcr.io/your-org/backend:latest \
  ghcr.io/your-org/frontend:latest

# Phase 5: Configure permissions
./scripts/azure/phases/deploy-phase5-permissions.sh

# Phase 6: Configure user access
./scripts/azure/phases/deploy-phase6-user-access.sh
```

### **Not Recommended: Bicep-Only Approach**

The main.bicep file can deploy most phases at once, but:
- May still encounter Key Vault timing issues
- Cannot handle Phase 4 (application updates) properly
- Cannot perform Phase 6 configuration completely

```bash
# Only use if you understand the limitations
az deployment group create \
  --resource-group your-rg \
  --template-file main.bicep \
  --parameters \
    namePrefix=aib \
    globalKeyVaultName=your-kv \
    globalKeyVaultResourceGroup=your-kv-rg
```

## Key Benefits of 6-Phase System

1. **Eliminates Chicken-and-Egg Problem**: Identities are created first
2. **Idempotent**: Each phase checks if work is already done
3. **Resumable**: Can restart from any failed phase
4. **Granular Control**: Can skip or retry individual phases
5. **Clear Dependencies**: Each phase depends on the previous ones
6. **Better Debugging**: Isolated failures are easier to troubleshoot

## What This Deploys (Scale-to-Zero Architecture)

- **Resource Group** (via CLI)
- **User-Assigned Managed Identities** (Phase 1)
- **Storage Account** (artifacts, static files)
- **Cosmos DB** (NoSQL, Serverless) with containers (idle ≈ $0)
- **Azure Container Apps Environment** + two apps (backend API, frontend) on Consumption (scale-to-zero)

## Costs (Typical Dev Environment)

- **Storage**: cents/month for small data
- **Cosmos Serverless**: ≈ $0 when idle
- **Container Apps (Consumption)**: ≈ $0 when idle (minor logging costs possible)
- **Managed Identities**: Free
- **Key Vault access**: Minimal transaction costs

## Prerequisites

- Azure CLI logged in: `az login`
- Subscription and region selected: `az account set -s <SUBSCRIPTION_ID>`
- Global Key Vault exists with GitHub token secret
- Container images available in private registry

## Environment Requirements

Ensure your `.env.production` file contains:

```bash
# Required for all phases
AZURE_RESOURCE_GROUP=rg_aib_prd
AZURE_LOCATION=eastus
APP_SHORT_NAME=aib
GLOBAL_KEY_VAULT_NAME=kv-technologoo-global
GLOBAL_KEY_VAULT_RG=rg_technologoo_global

# Required for final configuration (Phase 6)
VITE_OAUTH_CLIENT_ID=your-client-id
VITE_OAUTH_TENANT_ID=your-tenant-id
EntraAuth__ClientId=your-client-id
EntraAuth__TenantId=your-tenant-id
```

## Troubleshooting

- **Phase 1 fails**: Check Azure CLI authentication and resource group permissions
- **Phase 2 fails**: Verify managed identities exist from Phase 1
- **Phase 3 fails**: Check global Key Vault exists and has required secrets
- **Phase 4 fails**: Verify container images exist and are accessible
- **Phase 5 fails**: Check that identities have proper permissions
- **Phase 6 fails**: Verify OAuth configuration in Entra ID

Use `--dry-run` mode to preview changes before execution.

## Migration from v1 System

The old deployment system is archived in `archive-v1/`. To migrate:

1. Use the new 6-phase system for all new deployments
2. Existing deployments can be updated using the phase scripts
3. The old system is preserved for reference but not recommended