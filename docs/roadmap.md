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

- Phase 7 CLI alignment (new hostname + certificate commands).
- Private-network hardening (VNET + private endpoints, disable public network access).
- Monetization hooks (plan tiers, billing integration, entitlement checks).
- Deployment status improvements (stateless phase re-run, better progress UX).
- Onboarding wizard (profile completion, first project scaffold, NFR coach).
- Inventory UX redesign (card tinting, status badges, module filters).
- Approval workflows for org projects (owner/contributor/reader + sign-off logic).

## Bugs / Known Issues

- Progress badges show 5% overall even when no project is selected; Data & Consistency badge mismatched (33% vs 0%).
- Demo data sources appear in empty/no-project state (disable demo seed outside sandbox mode).
- Auto-save lacks visual feedback (needs “Saving…” indicator + last saved timestamp).
- Phase 7 script assumes legacy CLI flags; manual steps required to add hostname + managed cert.

_Last updated: 2025-09-19_

## Implementation Progress
- Frontend now uses Entra auth headers (`getAuthHeaders`) for backend migration flow; tokens + X-User-* come from MSAL.
