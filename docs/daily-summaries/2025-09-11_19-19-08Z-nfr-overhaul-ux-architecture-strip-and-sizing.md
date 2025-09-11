# Daily Summary — NFR Overhaul, UX, Regions, and Sizing

## Executive Summary
- Moved Cloud/Regions/DR to Project Settings (Public/US Gov, paired/manual), with NFR showing summary-only; added US Gov region family and pairing enforcement.
- Structured NFR inputs: Avg/Peak RPS, P95/P99 latency, Read/Write ratio, Data Growth/Retention, Monthly Budget — all feeding future recommendations/codegen.
- Architecture UX: 2‑column (Services | Your Architecture), always‑visible lanes, root drop auto‑routes to correct lane, richer cards, and “Often paired with …” hints.
- Sizing: Global XS–XL plus per‑service overrides with “Advanced for <size>” Suggested params (ACA/App Service, SQL, Cosmos, Blob, App GW/Front Door, Redis); persisted and surfaced on cards.
- Stability + UX: compact NFR strip under tabs; removed risky animation that caused Vite overlay; seam fixed by removing main top padding.
- Next: per‑lane completion counters, compliance selector (FedRAMP) with validations, techno‑modern style pass; then recommendations and codegen manifests.

## Active Objectives
- Add per‑lane completion counters based on NFR expectations.
- Introduce compliance selector (FedRAMP tiers) and validate against cloud family/regions.
- Apply techno‑modern styling (crisper borders, subtle grid, neon accents).
- Map NFR + size → recommendations; add non‑destructive “Suggest Architecture”.
- Emit codegen manifests (Bicep/ARM + ACA/AKS YAML).

## Today’s Changes
- Project Settings:
  - Identity + description; Cloud Family (Public/Gov), Regions & DR, Profile, Global Size (XS–XL).
  - Catalog filtering respects US Gov availability; suggests alternatives.
- NFR Form/Data:
  - Avg/Peak RPS split; P95/P99 with units; Read/Write ratio; Data Growth + Retention; Budget.
  - Region selector present but moving to Project Settings; NFR shows summary/link.
- Architecture Planner:
  - Two‑column layout; lanes always visible; larger drop targets; hover highlight; root drop auto‑routes to correct lane.
  - Rich architecture cards with info/remove; “Often paired with …” hints restored.
- Sizing Model:
  - Global XS–XL; per‑service overrides; “Advanced for <size>” Suggested params; persisted and displayed.
- Stability:
  - Removed flight animation; fixed Vite overlay; eliminated top padding gap; kept compact strip.

## Decisions & Rationale
- Cloud/Regions as project‑level: drives availability, pairing, and compliance globally; NFR remains requirement-focused.
- T‑shirt sizing (XS–XL) with overrides: fast intake for most teams with escape hatches for advanced tuning.
- Deterministic list view (no physics): better readability and export‑readiness; revisit 3D/graph later behind a flag.

## Open Issues
- Per‑lane completion counters not yet wired to NFR expectations.
- Compliance selector (FedRAMP tiers) not implemented; validations pending.
- Visual polish for the strip/tab join and overall techno‑modern theme pending.

## Next Steps
1) Implement per‑lane completion counters based on NFR selections.
2) Add compliance selector with FedRAMP tiers; validate against cloud family + region selection.
3) Apply techno‑modern styling across catalog and planner.
4) Implement recommendation mapping and a non‑destructive “Suggest Architecture”.
5) Generate code manifests (Bicep/ARM; ACA/AKS YAML) from the architecture state.

## Run / Validate Notes
- Frontend dev: `cd frontend && npm run dev` → open the printed URL (default http://localhost:5173/). Use root or `/cloud-architecture`.
- If port busy: use the exact port Vite prints; hard refresh if overlay persists.
- Drag by the colored top bar on service cards; drop anywhere in "Your Architecture" — it routes to the correct lane.


### [2025-09-11T14:10:00Z] (event_type: architecture, importance: high)
- Agreed on multi-level NFR structure: Project Baseline, Regional Requirements, Workload, and Data Source levels; Residency/Compliance at project scope.
- Clarified precedence and how requirements drive services/SKUs and codegen (Bicep/ARM, ACA/AKS YAML).
- Tags: #nfr #levels #architecture #codegen

### [2025-09-11T14:40:00Z] (event_type: implementation, importance: high)
- Structured NFR inputs: split Avg/Peak RPS, Latency P95/P99 with units, Read/Write ratio, Data Growth + Retention, Monthly Budget (numeric-with-units).
- Updated form renderer and data model to support compound inputs and validation.
- Tags: #nfr #forms #validation

### [2025-09-11T15:05:00Z] (event_type: implementation, importance: high)
- Azure Region Selector added with pairing guidance and US Gov family support (family-aware pairing, manual secondary filtered to same family).
- Decided to move Cloud/Family/Regions to Project Settings (top-level), not NFR; NFR will show a summary and link.
- Tags: #azure #regions #gov #pairing

### [2025-09-11T15:30:00Z] (event_type: ux, importance: high)
- Architecture canvas improvements: per-category lanes always visible, larger drop targets, compatible hover highlight, and root dropzone that auto-routes to the correct lane.
- Replaced tiny chips with richer architecture cards (name, tier, brief details) plus info/remove actions.
- Restored “Often paired with …” hints; kept non-destructive suggestions after drop.
- Tags: #ux #dragdrop #architecture

### [2025-09-11T16:00:00Z] (event_type: planning, importance: normal)
- Explored “modular synthesis” visualization; paused physics/3D for later. Removed Rack View (Beta) per feedback to keep the interface intentional and compact.
- Plan: deterministic list view now; consider graph/r3f later behind a feature flag.
- Tags: #visualization #rack #future

### [2025-09-11T16:20:00Z] (event_type: implementation, importance: high)
- Project Settings modal: project identity (read-only with edit), description, Cloud Family (Public/Gov), Regions & DR strategy, Profile (starter/standard/enterprise/custom), Global Size.
- Catalog filtering for US Gov availability with suggested alternatives when public-only.
- Tags: #project-settings #gov #catalog

### [2025-09-11T16:45:00Z] (event_type: implementation, importance: high)
- Sizing model: global XS/S/M/L/XL with per-service overrides; “Advanced for <size>” shows Suggested params (ACA/App Service, SQL, Cosmos, Blob, App GW/Front Door, Redis) and persists per-service.
- Catalog size selector aligned to XS–XL; chips show size badges; overrides saved in project architecture.
- Tags: #sizing #defaults #sku #persistence

### [2025-09-11T17:05:00Z] (event_type: ux, importance: normal)
- Page layout: switched to compact strip + two-column layout (Services | Your Architecture). NFR lives in a collapsible panel.
- Attempted “joined tab → strip” animation; reverted flight animation due to Vite runtime issues. Kept stable, compact strip and removed top padding seam.
- Tags: #layout #strip #animation #vite

### [2025-09-11T17:25:00Z] (event_type: troubleshooting, importance: high)
- Fixed dev server issues: removed main top padding gap, reverted flight code causing overlay, stabilized Layout and CloudArchitecturePage.
- Outcome: no runtime errors; strip compact; drag/drop solid; root drop auto-routing works.
- Tags: #vite #bugfix #layout

### [2025-09-11T17:40:00Z] (event_type: roadmap, importance: high)
- Next: per-lane completion counters tied to NFR expectations (e.g., Data lane expects Document/Relational); compliance selector (FedRAMP tiers) in Project Settings with validations; techno-modern style pass (crisper borders, subtle grid, neon accents).
- Later: recommendations → “Suggest Architecture” adds services non-destructively; codegen manifests (Bicep/ARM + ACA/AKS YAML).
- Tags: #roadmap #compliance #recommendations #style

### [2025-09-11T19:40:00Z] (event_type: ux, importance: high)
- Joined tab + unified bordered strip implemented for Cloud Architecture. Border now visually continues around tab icon and down into NFR panel; removed seam by disabling nav bottom border on “joined” routes.
- Square top-left corner applied only to Cloud Architecture; other tabs keep rounded corners.
- Tags: #ux #tabs #strip #border

### [2025-09-11T19:45:00Z] (event_type: implementation, importance: high)
- Full-width (12-col) strip for Cloud Architecture; expanded NFR panel moved into a padded white section below the strip.
- Active tab labels hidden (icon-only) when selected across all tabs; removed text animations for stability.
- Tags: #layout #strip #animation

### [2025-09-11T19:55:00Z] (event_type: implementation, importance: normal)
- Added pages with joined strip pattern for remaining tabs: API Development, Frontend Development, System Integration, AI Development. Wired routes in `frontend/src/App.tsx`.
- Tags: #routing #pages #consistency

### [2025-09-11T20:00:00Z] (event_type: troubleshooting, importance: normal)
- Prevented hairline under tab by removing nav bottom border and padding on joined routes; ensured `-mb-px` on active tab overlaps container border.
- Tags: #bugfix #css #tailwind
