# Deployment & Architecture Notes — 2025-09-17

## Deployment Pipeline
- Build scripts now target linux/amd64 via `docker buildx`; use `./scripts/build-containers.sh ghcr.io/<org>/<image> <tag> --push` before phase 4.
- Six-phase orchestrator auto-skips completed work; current blocker is Container App picking up the freshly pushed tag.
- Frontend production build fixed with `vite-env.d.ts`, adjusted TypeScript strictness, and updated MSAL redirect handling.

## Architecture & NFR Enhancements
- Extend the NFR questionnaire with a "Security & Operations Extras" section so users can opt into or automatically require:
  - Azure Firewall or Firewall Premium for full egress control.
  - Private Link + private DNS zones for every PaaS service (Storage, Cosmos, Key Vault, Container Apps, etc.).
  - DDoS Protection Standard for external workloads and Azure Front Door / CDN when global ingress is needed.
  - Defender for Cloud plans per workload (App, SQL, Storage, Containers) with clear cost callouts.
  - Long-retention Log Analytics / Sentinel for SOC use cases with warnings about GB-based pricing.
  - Azure Backup/Site Recovery, Bastion, and managed jumpbox patterns for regulated environments.
- Map each NFR toggle to an auto-added service or pattern in the architecture canvas (e.g., selecting "Edge TLS termination" injects Application Gateway + WAF).
- Align pattern cards with the Azure AI Foundry reference architecture: managed vNets, private endpoints, managed identities, API Management/App Gateway perimeter, centralized Key Vault.
- Surface cost guidance inline ("High", "Medium") so teams understand trade-offs when enabling extras, and feed those choices into deployment recipes.

## Follow-Up Actions
- Push the latest backend/frontend images and rerun the orchestrator to finish phases 4–6.
- Capture the six-phase deployment + verification flow as a reusable pattern for future recipes.
- Update the architecture UI to display security cost toggles and auto-seed the canvas based on NFR selections.
