# Architect in a Box — Roadmap & Backlog

## Milestones

- 2025-09-19 — Entra ID login success (MSAL gate, custom domain rebind, redirect fixes). ✅
- 2025-09-19 — Project sharing backend (Owner & collaborator roles). ✅
- TBD — Multi-user frontend (profile badge, share UI, onboarding wizard).
- TBD — RAG indicators for NFR coverage (red/amber/green lifecycle).
- TBD — Teardown automation with keep-data/full-wipe options.

## Near-Term Roadmap

| Date Target | Item | Notes |
|-------------|------|-------|
| 2025-09-22 | Pipeline auth | Flow Entra user context from MSAL to backend; remove dev ownerScope/ownerId query args |
| 2025-09-24 | Profile & badge UI | Header badge, profile settings (preferred name, avatar), share modal skeleton |
| 2025-09-26 | RAG NFR indicators | Status mapping (missing, planned, provisioned/approved); inventory item statuses |
| 2025-09-29 | Teardown enhancements | `--keep-data` vs `--full-wipe`, docs + validation run |

## Backlog

- **Demo project mode for new users**: Auto-load read-only demo project (`__demo__` flag) with fully populated NFRs and architecture to showcase platform capabilities. Include persistent banner with "Create Your First Project" CTA. Demo data not persisted on modification.
- **Last-viewed project persistence**: Store `lastViewedProjectId` in localStorage; returning users default to last-worked project (fallback: most recently modified, then first in list).
- **Interactive product tour**: Optional guided tour (Shepherd.js/Intro.js) highlighting NFR assessment, architecture canvas, cost estimates, and project creation flow.
- Phase 7 CLI alignment (new hostname + certificate commands).
- Private-network hardening (VNET + private endpoints, disable public network access).
- Monetization hooks (plan tiers, billing integration, entitlement checks).
- Deployment status improvements (stateless phase re-run, better progress UX).
- Onboarding wizard (profile completion, first project scaffold, NFR coach).
- Inventory UX redesign (card tinting, status badges, module filters).
- Approval workflows for org projects (owner/contributor/reader + sign-off logic).
- Cost report driven by NFR usage (average vs peak load, scaling breakdowns, licensing callouts).
- NFR extensions for user counts and Microsoft 365 workload selection (drive Entra/M365 licensing).
- Add Cosmos SQL repository implementation and config toggle (true SQL API support alongside Mongo-compatible path).
- Identity provider & auth flows blade with audience presets, provider tiles, and optional advanced flow toggles.
- Microsoft 365 service add-on catalog (Logic Apps, SPFx, declarative agents, Power Platform connectors).
- Component-level requirement consoles ("flip" cards) for key services (App Service, VNET, Synapse) with override-aware tuning and template preview.
- Scoped NFR overrides attached to components/workstreams while inheriting from global baselines.
- Wireframe "rack back" interaction for visualizing service wiring (dependencies, networking, logging).

## Bugs / Known Issues
- Avatar picker does not persist selection (localStorage update confirmed, but badge not refreshing).

- Progress badges show 5% overall even when no project is selected; Data & Consistency badge mismatched (33% vs 0%).
- Demo data sources appear in empty/no-project state (disable demo seed outside sandbox mode).
- Auto-save lacks visual feedback (needs “Saving…” indicator + last saved timestamp).
- Phase 7 script assumes legacy CLI flags; manual steps required to add hostname + managed cert.

_Last updated: 2025-09-30_

## Implementation Progress
- Header now shows user badge with fun avatar picker; layout responsive tweaks move project selector below title on mobile.
- Frontend now uses Entra auth headers (`getAuthHeaders`) for backend migration flow; tokens + X-User-* come from MSAL.
