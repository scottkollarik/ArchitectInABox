# Daily Notes — 2025-09-18

## Phase 7 Custom Domain Flow
- Optional `--custom-domain` support landed in the orchestrator; phase script (`deploy-phase7-custom-domain.sh`) requests a managed cert and prints DNS records for non-Azure zones.
- Azure DNS automation is available when `--dns-zone-name` and `--dns-zone-resource-group` are provided; otherwise, you add `asuid.<host>` TXT + CNAME manually.
- GoDaddy use-case documented: need real DNS records, not HTTP forwarding.

## Phase 5 Permissions Follow-Up
- Verification now uses `az cosmosdb sql role assignment list` and grabs storage account ID to catch inherited roles.
- CLI-based grants (Cosmos Built-in Data Contributor, Storage Blob roles) succeed with retry loop for propagation.

## Bare-Domain Strategy
- Container App serves `/aib`; root domain still needs a landing page.
- Cheapest options: Azure Static Web Apps Free tier (automatic HTTPS + custom domain) or Storage Static Website + CDN. SWA preferred for a no-cost redirect/landing page.

## Action Items
1. Add TXT `asuid.www` → `29D20313375DF69AD43F24F84064E093985525C585E8290185FD2237EF7E3997` and CNAME `www` → `aib-frontend...azurecontainerapps.io` in GoDaddy. Rerun Phase 7 after propagation.
2. Stand up SWA (or alternative) for root `technologoo.com` to host landing page / redirect to `/aib`.
3. Once DNS validates, Phase 7 completes and `https://www.technologoo.com/aib` goes live with managed TLS.
