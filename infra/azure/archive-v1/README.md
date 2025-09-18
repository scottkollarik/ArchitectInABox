# Archived Deployment System v1

**Archived Date:** 2025-09-17
**Reason:** Replaced with 6-phase deployment system to resolve Key Vault authentication timing issues

## What Was Archived

This folder contains the original deployment system that was replaced due to the "chicken-and-egg" problem with Key Vault authentication during Container Apps deployment.

### Archived Files:
- `main.bicep` - Original monolithic Bicep template
- `deploy.sh` - Original single-script deployment approach
- `configure-secrets.sh` - Original secrets configuration script

## Issues with v1 System

1. **Key Vault Timing Problem**: Container Apps needed Key Vault secrets during deployment, but managed identities didn't exist until after deployment
2. **Monolithic Deployment**: Single large deployment made it difficult to debug and resume failed deployments
3. **No Idempotency**: Scripts couldn't safely be re-run if deployment failed partway through

## Replacement System

The new 6-phase deployment system resolves these issues by:
1. Creating managed identities first (Phase 1)
2. Deploying infrastructure with pre-existing identities (Phase 2)
3. Wiring up Key Vault access after identities exist (Phase 3)
4. Deploying applications with proper authentication (Phase 4)
5. Configuring resource permissions (Phase 5)
6. Setting up user access (Phase 6)

## How to Use v1 System (Not Recommended)

If you need to reference the old system:
```bash
# Deploy using old system (may fail due to Key Vault timing issues)
./infra/azure/archive-v1/deploy.sh <rg> <location> <prefix> <backend-image> <frontend-image>
```

**Recommendation:** Use the new 6-phase system instead:
```bash
./scripts/azure/deploy-aib-complete.sh
```