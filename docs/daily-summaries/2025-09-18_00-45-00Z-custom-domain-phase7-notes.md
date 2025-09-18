# Daily Notes — 2025-09-18

## Phase 7: Custom Domain Integration
- Added optional Phase 7 (`deploy-phase7-custom-domain.sh`) to the deploy orchestrator so the pipeline can bind `www` hostnames automatically after phases 1–6.
- New script flags: `--custom-domain`, `--dns-zone-name`, `--dns-zone-resource-group`; allows Auto-DNS when running against Azure DNS zones, otherwise prints the CNAME/TXT records for manual entry.
- Ensures managed certificate requests kick off via `az containerapp hostname bind --validation-method CNAME` and loops until the managed cert provisioning completes.

## Phase 5 Hardening
- Replaced Bicep role assignments with direct CLI calls to grant Cosmos (Built-in Data Contributor) and Storage roles.
- Updated verification to query `az cosmosdb sql role assignment list` and reused storage account ID to detect inherited assignments.
- Added retry loop to handle propagation delays before marking the phase complete.

## Frontend Build Fixes
- Introduced `vite-env.d.ts` for typed `import.meta.env` and relaxed `noUnusedLocals/Parameters` in `frontend/tsconfig.json` to support current codebase.
- Patched `PercentageSplit` and MSAL handler to compile cleanly under `npm run build` for linux/amd64 images.

## Next Actions
- Rerun `./scripts/azure/deploy-aib-complete.sh` from phase 6 onward with `--custom-domain` flags once DNS details confirmed.
- Capture the pattern for reuse: six core phases, optional custom domain, secret verification, and buildx instructions for amd64 images.
- Begin planning UI/recipe updates so NFR selections can auto-enable security extras and custom domain configuration.
