# Complete Deployment Guide - NEW 6-Phase System

## 🎯 **NEW: 6-Phase Deployment System**

**⚠️ IMPORTANT**: The deployment system has been upgraded to resolve Key Vault authentication timing issues. The old system is archived in `infra/azure/archive-v1/` and `scripts/azure/archive-v1/`.

**Use the new 6-phase deployment system for all deployments.**

## 📋 **Quick Start (Recommended):**

```bash
# Complete deployment in one command
./scripts/azure/deploy-aib-complete.sh \
  --backend-image ghcr.io/scottkollarik/tap-backend:latest \
  --frontend-image ghcr.io/scottkollarik/tap-frontend:latest

# Preview changes first (recommended)
./scripts/azure/deploy-aib-complete.sh --dry-run \
  --backend-image ghcr.io/scottkollarik/tap-backend:latest \
  --frontend-image ghcr.io/scottkollarik/tap-frontend:latest
```

## 📋 **Detailed Step-by-Step Process:**

### **Step 1: Create Production Environment**
```bash
# Copy template and fill with YOUR values
cp .env.production.template .env.production
```

Edit `.env.production` with:
```bash
# Application Identity (quotes required for spaces!)
APP_NAME="Architect in a Box"
APP_SHORT_NAME=aib

# Your Custom Domain
CUSTOM_DOMAIN=www.technologoo.com

# Your Existing Entra ID App Info
VITE_OAUTH_CLIENT_ID=[Your Client ID]
VITE_OAUTH_TENANT_ID=[Your Tenant ID]
EntraAuth__ClientId=[Your Client ID]
EntraAuth__TenantId=[Your Tenant ID]
VITE_OAUTH_REDIRECT_URI=https://www.technologoo.com/aib/auth/callback

# These will be filled after Step 2:
# VITE_API_URL=https://...  (from deployment output)
# ConnectionStrings__CosmosDB=...  (from Azure)
# ConnectionStrings__AzureBlob=...  (from Azure)
```

### **Step 2: Build and Push Containers**
```bash
# Build containers (replace 'myregistry' with your Docker Hub username or registry)
./scripts/build-containers.sh myregistry latest

# Or if using Docker Hub:
./scripts/build-containers.sh yourdockerhubusername latest
```

### **Step 3: Deploy Using 6-Phase System**

**NEW: The deployment now uses a 6-phase approach that eliminates Key Vault timing issues:**

#### **Option A: Complete Deployment (Recommended)**
```bash
# Deploy everything in logical phases
./scripts/azure/deploy-aib-complete.sh \
  --backend-image ghcr.io/scottkollarik/tap-backend:latest \
  --frontend-image ghcr.io/scottkollarik/tap-frontend:latest
```

#### **Option B: Manual Phase-by-Phase**
```bash
# Phase 1: Create managed identities (eliminates chicken-and-egg problem)
./scripts/azure/phases/deploy-phase1-identities.sh

# Phase 2: Deploy infrastructure with pre-existing identities
./scripts/azure/phases/deploy-phase2-infrastructure.sh

# Phase 3: Wire up Key Vault access (now identities exist!)
./scripts/azure/phases/deploy-phase3-keyvault-wiring.sh

# Phase 4: Deploy applications with private images
./scripts/azure/phases/deploy-phase4-applications.sh \
  ghcr.io/scottkollarik/tap-backend:latest \
  ghcr.io/scottkollarik/tap-frontend:latest

# Phase 5: Configure resource permissions
./scripts/azure/phases/deploy-phase5-permissions.sh

# Phase 6: Configure user access and get final configuration
./scripts/azure/phases/deploy-phase6-user-access.sh
```

#### **What the 6-Phase System Creates:**
- **Phase 1**: User-assigned managed identities
- **Phase 2**: Resource Group, Storage Account, Cosmos DB, Container Apps Environment, Container Apps (with placeholder images)
- **Phase 3**: Key Vault permissions and registry authentication
- **Phase 4**: Private container images deployment
- **Phase 5**: Resource access permissions (CosmosDB, Storage)
- **Phase 6**: OAuth configuration and deployment summary

### **Step 4: Get Configuration from Phase 6 Output**

**NEW: Phase 6 automatically provides all connection strings and configuration!**

After Phase 6 completes, you'll see output like:
```bash
# Application URLs
VITE_API_URL=https://aib-backend.eastus.azurecontainerapps.io/aib/api
VITE_OAUTH_REDIRECT_URI=https://aib-frontend.eastus.azurecontainerapps.io/aib/auth/callback

# Connection Strings (keep these secure!)
ConnectionStrings__CosmosDB="AccountEndpoint=https://aib-cosmos.documents.azure.com:443/;AccountKey=your-key;"
ConnectionStrings__AzureBlob="DefaultEndpointsProtocol=https;AccountName=aibsa123abc;AccountKey=your-key;EndpointSuffix=core.windows.net"
```

### **Step 5: Update .env.production and Configure Secrets**

**Add the values from Phase 6 to your `.env.production` file**, then configure secrets:

```bash
# Configure Container Apps secrets (secure!)
./scripts/azure/configure-secrets.sh rg_aib_prd aib
```

### **Step 6: Update Entra ID Redirect URI**
```bash
# Update your existing Entra ID app with the redirect URI from Phase 6 output
az ad app update --id [Your Client ID] --web-redirect-uris "https://your-frontend-url/aib/auth/callback"
```

### **Step 7: Test Your Deployment**
```bash
# Test backend health
curl https://your-backend-url/aib/health

# Open frontend in browser
open https://your-frontend-url
```

## 🎯 **What the 6-Phase System Actually Creates:**

The new 6-phase system creates:

1. **User-Assigned Managed Identities**: `aib-backend-identity`, `aib-frontend-identity` (Phase 1)
2. **Storage Account**: `aibsa-abc123` (artifacts) (Phase 2)
3. **Cosmos DB**: `aib-cosmos` (serverless, scale-to-zero) with containers (Phase 2)
4. **Container Apps Environment**: `aib-cae` (Phase 2)
5. **Backend Container App**: `aib-backend` (Phase 2)
6. **Frontend Container App**: `aib-frontend` (Phase 2)
7. **Key Vault Permissions**: Access to `kv-technologoo-global` (Phase 3)
8. **Private Registry Authentication**: GitHub Container Registry access (Phase 4)
9. **Resource Permissions**: CosmosDB and Storage access (Phase 5)
10. **OAuth Configuration**: Redirect URIs and final setup (Phase 6)

## 🔄 **Recovery and Resumption**

### **Resume Failed Deployment**
```bash
# Resume from Phase 3 if Phases 1-2 completed
./scripts/azure/deploy-aib-complete.sh --resume-from-phase 3 \
  --backend-image ghcr.io/scottkollarik/tap-backend:latest \
  --frontend-image ghcr.io/scottkollarik/tap-frontend:latest
```

### **Check Deployment Status**
```bash
# Each phase shows current status
./scripts/azure/phases/deploy-phase1-identities.sh --dry-run
```

### **Skip Problematic Phase (for testing)**
```bash
# Skip Phase 4 if testing infrastructure only
./scripts/azure/deploy-aib-complete.sh --skip-phase 4
```

## ✨ **Benefits of 6-Phase System:**

1. **🔧 Eliminates Key Vault Chicken-and-Egg Problem**: Identities created first
2. **♻️ Idempotent**: Each phase checks if work is already done
3. **🔄 Resumable**: Can restart from any failed phase
4. **🎯 Granular Control**: Can skip or retry individual phases
5. **🔍 Better Debugging**: Isolated failures are easier to troubleshoot
6. **📊 Status Tracking**: Clear visibility into deployment progress

## 🚨 **Common Issues and Solutions:**

### **Key Vault Not Found (Phase 3)**
```bash
# Error: "Key Vault 'kv-technologoo-global' not found"
# Solution: Ensure global Key Vault exists and contains 'github-token-aib' secret
```

### **Container Image Not Accessible (Phase 4)**
```bash
# Error: "Failed to pull image"
# Solution: Verify image exists and Key Vault contains valid GitHub token
```

### **Spaces in .env Values**
```bash
# Wrong:
APP_NAME=Architect in a Box

# Right:
APP_NAME="Architect in a Box"
```

### **Phase Dependencies Not Met**
```bash
# Error: "Phase X must be completed first"
# Solution: Run previous phases or use --resume-from-phase
```

## 🔧 **Quick Test Commands:**

```bash
# Test containers locally first:
docker run -p 5001:5000 ghcr.io/scottkollarik/tap-backend:latest
docker run -p 5173:80 ghcr.io/scottkollarik/tap-frontend:latest

# Test deployment after Phase 6:
curl https://aib-backend.eastus.azurecontainerapps.io/aib/health

# Preview deployment without making changes:
./scripts/azure/deploy-aib-complete.sh --dry-run
```

## 📞 **If Things Go Wrong:**

### **For Phase-Specific Issues:**
```bash
# Check specific phase status
./scripts/azure/phases/deploy-phase3-keyvault-wiring.sh --dry-run

# Resume from failed phase
./scripts/azure/deploy-aib-complete.sh --resume-from-phase 3

# Check deployment logs for specific phase
az deployment group show --resource-group rg_aib_prd --name phase2-infrastructure-...
```

### **For Container Issues:**
```bash
# Check container logs
az containerapp logs show --resource-group rg_aib_prd --name aib-backend

# Verify images exist and are accessible
docker pull ghcr.io/scottkollarik/tap-backend:latest
```

### **For Key Vault Issues:**
```bash
# Check Key Vault access
az keyvault secret show --vault-name kv-technologoo-global --name github-token-aib

# Check managed identity permissions
az role assignment list --assignee <identity-principal-id> --scope <keyvault-scope>
```

## 📚 **Migration from Old System**

The old deployment system (v1) is archived in:
- `infra/azure/archive-v1/`
- `scripts/azure/archive-v1/`

**For new deployments, always use the 6-phase system.**

The key benefits: **6-phase system eliminates timing issues, provides granular control, and enables resumable deployments!**