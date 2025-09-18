# Azure Deployment Scripts - 6-Phase System

This directory contains the deployment scripts for the new 6-phase deployment system that resolves Key Vault authentication timing issues.

## Directory Structure

```
scripts/azure/
├── README.md                           # This file
├── deploy-aib-complete.sh              # Master orchestrator script
├── archive-v1/                         # Archived old scripts
│   ├── deploy.sh                       # Original deployment script
│   └── configure-secrets.sh            # Original secrets script
├── phases/                             # Individual phase scripts
│   ├── deploy-phase1-identities.sh     # Create managed identities
│   ├── deploy-phase2-infrastructure.sh # Deploy core infrastructure
│   ├── deploy-phase3-keyvault-wiring.sh # Wire up Key Vault access
│   ├── deploy-phase4-applications.sh   # Deploy private applications
│   ├── deploy-phase5-permissions.sh    # Configure resource permissions
│   └── deploy-phase6-user-access.sh    # Configure user access
└── utils/                              # Shared utility functions
    ├── check-azure-cli.sh              # Azure CLI validation
    ├── load-environment.sh             # Environment file loading
    └── deployment-status.sh            # Deployment status tracking
```

## Quick Start

### **Complete Deployment (Recommended)**

```bash
# Full deployment with all 6 phases
./deploy-aib-complete.sh \
  --backend-image ghcr.io/scottkollarik/tap-backend:latest \
  --frontend-image ghcr.io/scottkollarik/tap-frontend:latest

# Preview what would happen (dry run)
./deploy-aib-complete.sh --dry-run \
  --backend-image ghcr.io/scottkollarik/tap-backend:latest \
  --frontend-image ghcr.io/scottkollarik/tap-frontend:latest
```

### **Resume Failed Deployment**

```bash
# Resume from Phase 3 if Phases 1-2 completed successfully
./deploy-aib-complete.sh --resume-from-phase 3 \
  --backend-image ghcr.io/scottkollarik/tap-backend:latest \
  --frontend-image ghcr.io/scottkollarik/tap-frontend:latest
```

### **Manual Phase Execution**

```bash
# Run phases individually for maximum control
./phases/deploy-phase1-identities.sh
./phases/deploy-phase2-infrastructure.sh
./phases/deploy-phase3-keyvault-wiring.sh
./phases/deploy-phase4-applications.sh \
  ghcr.io/scottkollarik/tap-backend:latest \
  ghcr.io/scottkollarik/tap-frontend:latest
./phases/deploy-phase5-permissions.sh
./phases/deploy-phase6-user-access.sh
```

## Phase Details

### **Phase 1: Managed Identities** (`deploy-phase1-identities.sh`)
**Purpose**: Create user-assigned managed identities for Container Apps

**What it does**:
- Creates `{namePrefix}-backend-identity`
- Creates `{namePrefix}-frontend-identity`
- Outputs identity IDs for use in later phases

**Idempotency**: Checks if identities exist before creating new ones

**Example**:
```bash
./phases/deploy-phase1-identities.sh
./phases/deploy-phase1-identities.sh --dry-run  # Preview only
```

### **Phase 2: Infrastructure** (`deploy-phase2-infrastructure.sh`)
**Purpose**: Deploy core Azure resources with pre-existing identities

**What it does**:
- Creates Container Apps Environment
- Creates Storage Account for artifacts
- Creates CosmosDB with containers (projects, nfrAssessments, logs)
- Creates Container Apps with placeholder images and assigned identities

**Dependencies**: Phase 1 must be completed

**Idempotency**: Checks each resource individually before creation

### **Phase 3: Key Vault Wiring** (`deploy-phase3-keyvault-wiring.sh`)
**Purpose**: Grant managed identities access to global Key Vault

**What it does**:
- Grants "Key Vault Secrets User" role to both identities
- Configures Container Apps to reference Key Vault secrets
- Sets up `github-token` secret references for private registry access

**Dependencies**: Phase 2 must be completed

**Requirements**: Global Key Vault must exist with `github-token-aib` secret

### **Phase 4: Applications** (`deploy-phase4-applications.sh`)
**Purpose**: Update Container Apps to use private container images

**Usage**:
```bash
./phases/deploy-phase4-applications.sh <backend-image> <frontend-image>
```

**What it does**:
- Updates backend Container App to use private backend image
- Updates frontend Container App to use private frontend image
- Configures registry authentication using Key Vault secrets
- Restarts Container Apps to pull new images

**Dependencies**: Phase 3 must be completed

### **Phase 5: Permissions** (`deploy-phase5-permissions.sh`)
**Purpose**: Grant managed identities access to Azure resources

**What it does**:
- Grants backend identity access to CosmosDB (Built-in Data Contributor)
- Grants backend identity access to Storage Account (Blob Data Contributor)
- Grants frontend identity read access to Storage Account (Blob Data Reader)

**Dependencies**: Phase 4 must be completed

### **Phase 6: User Access** (`deploy-phase6-user-access.sh`)
**Purpose**: Configure OAuth and provide deployment summary

**What it does**:
- Retrieves connection strings for CosmosDB and Storage
- Generates OAuth redirect URIs
- Provides configuration summary for `.env.production`
- Shows next steps for completing the deployment

**Dependencies**: Phase 5 must be completed

### **Phase 7: Custom Domain (Optional)** (`deploy-phase7-custom-domain.sh`)
**Purpose**: Bind a friendly hostname (e.g., `www.yourdomain.com`) to the frontend Container App.

**What it does**:
- Captures the generated Container App FQDN and initiates a managed-certificate binding via `az containerapp hostname bind`.
- Outputs (or optionally writes) the required DNS records (CNAME/TXT) so Azure can validate the domain and serve traffic over HTTPS.
- Creates DNS records automatically when you supply `--dns-zone-name` and `--dns-zone-resource-group`.

**Dependencies**: Phases 1–4 must be completed (frontend Container App deployed).

## Utility Functions

### **Azure CLI Check** (`utils/check-azure-cli.sh`)
- Validates Azure CLI installation
- Checks authentication status
- Displays current subscription

### **Environment Loading** (`utils/load-environment.sh`)
- Loads variables from `.env.production` (or specified file)
- Validates required variables are set
- Exports variables for use by deployment scripts

### **Deployment Status** (`utils/deployment-status.sh`)
- Tracks completion status of each phase
- Enables resumable deployments
- Creates `.deployment-status` JSON file

## Environment File Requirements

Create `.env.production` with these required variables:

```bash
# Core Configuration
AZURE_RESOURCE_GROUP=rg_aib_prd
AZURE_LOCATION=eastus
APP_SHORT_NAME=aib

# Global Key Vault (must exist)
GLOBAL_KEY_VAULT_NAME=kv-technologoo-global
GLOBAL_KEY_VAULT_RG=rg_technologoo_global

# OAuth Configuration (for Phase 6)
VITE_OAUTH_CLIENT_ID=your-entra-client-id
VITE_OAUTH_TENANT_ID=your-entra-tenant-id
EntraAuth__ClientId=your-entra-client-id
EntraAuth__TenantId=your-entra-tenant-id
```

## Error Handling and Recovery

### **Common Issues**

1. **Azure CLI not logged in**
   - Error: "Please run 'az login' to setup account"
   - Solution: Run `az login` and ensure correct subscription is selected

2. **Missing Key Vault**
   - Error: "Key Vault not found"
   - Solution: Ensure global Key Vault exists and contains `github-token-aib` secret

3. **Container image not accessible**
   - Error: "Failed to pull image"
   - Solution: Verify image exists and Key Vault contains valid GitHub token

4. **Phase dependency not met**
   - Error: "Phase X must be completed first"
   - Solution: Run previous phases or use `--resume-from-phase`

### **Recovery Strategies**

1. **Use dry run mode** to preview changes: `--dry-run`
2. **Resume from failed phase**: `--resume-from-phase N`
3. **Check deployment status**: Each script shows current status
4. **Manual cleanup**: Delete specific resources and re-run phases

### **Debug Mode**

Add debug output to any script:
```bash
export DEBUG=true
./phases/deploy-phase1-identities.sh
```

## Differences from v1 System

| Aspect | v1 (Archived) | v2 (6-Phase) |
|--------|---------------|--------------|
| **Key Vault Timing** | Chicken-and-egg problem | Resolved with identities-first |
| **Idempotency** | Limited | Full idempotency checks |
| **Resumability** | Manual | Automatic with status tracking |
| **Granularity** | Monolithic | Phase-by-phase control |
| **Debugging** | Single large failure | Isolated phase failures |
| **Rollback** | Manual | Phase-specific rollback |

## Migration from v1

If you have an existing v1 deployment:

1. **Backup**: Export any important data
2. **Clean slate**: Consider starting fresh with v2 system
3. **Gradual migration**: Use phase scripts to update specific components
4. **Reference**: Old scripts preserved in `archive-v1/` for comparison

## Best Practices

1. **Always start with dry run**: Use `--dry-run` to preview changes
2. **Use meaningful names**: Consistent naming across resources
3. **Monitor costs**: Use scale-to-zero architecture
4. **Secure secrets**: Never commit actual secrets to Git
5. **Test phases individually**: Easier to debug than full deployment
6. **Keep backups**: Export important data before major changes
