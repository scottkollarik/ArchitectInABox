## Executive Summary
- Added Inventory tab (second in nav) with joined strip and overview panel; shows “ghost” service cards grouped by Databases and Object & File Storage, reflecting selections from Your Architecture.
- Tightened NFR inputs: Latency (ms‑only with seconds hint), compact Avg/Peak RPS (commify), compact single‑line Data Growth & Retention; item/document size now a SizeRange control.
- Residency moved to Project Settings (policy + countries); NFR residency is notes textarea.
- Fixed sticky Your Architecture panel and joined strip seam issues; Inventory uses a database icon for clarity.

## Today’s Changes
- Inventory
  - New page with joined strip, “Show/Hide Overview”, and grouped ghost cards.
  - Ghost cards show name, status, optional size (override), last update, and “Telemetry: not connected”.
  - Files: frontend/src/modules/inventory/pages/InventoryPage.tsx; frontend/src/components/Layout.tsx; frontend/src/App.tsx
- NFR Inputs
  - LatencyTargets: ms‑only (P95/P99), legacy seconds auto‑converted; shows ≈ seconds hint when ≥1000ms.
  - Avg/Peak RPS: compact two inputs, numeric text; commas added on blur.
  - Data Growth & Retention: single compact line.
  - Item/document size: SizeRange (min/max + unit) with inline validation.
  - Files: frontend/src/modules/cloud-architecture/components/inputs/LatencyTargets.tsx; frontend/src/modules/cloud-architecture/components/NFRAssessmentForm.tsx; frontend/src/modules/cloud-architecture/data/nfrData.ts; frontend/src/modules/cloud-architecture/components/inputs/SizeRange.tsx
- Residency
  - Project Settings: Residency Policy (No restriction / In‑country / In‑geo / Custom) + Countries CSV when applicable.
  - NFR: “Residency notes (optional)” textarea.
  - Files: frontend/src/components/ProjectSettingsModal.tsx; frontend/src/modules/cloud-architecture/data/nfrData.ts; frontend/src/modules/cloud-architecture/components/NFRAssessmentForm.tsx
- Joined Strips & Layout
  - Inventory uses welded strip; nav joins for all tabs; sticky Architecture panel; seam fixes.
  - Files: frontend/src/components/Layout.tsx; frontend/src/modules/cloud-architecture/pages/CloudArchitecturePage.tsx
- Demo data
  - Seed 3 example data sources (SQL, Document, Blob) once per session for immediate “filled‑out” UI.
  - File: frontend/src/modules/cloud-architecture/components/NFRAssessmentForm.tsx

## Decisions & Rationale
- Inventory shows “ghost” resources until provisioned/connected; later, cards will light up with telemetry quick stats.
- Latency in milliseconds reduces ambiguity; seconds remain as a readability hint only.
- Residency policy belongs at project level; NFR keeps narrative notes only.
- Compact inputs reduce scroll and make scanning easier; unrelated fields remain on separate lines.

## Open Issues
- Collapsible Data Model cards with summary headers not yet implemented.
- Architecture DnD polish: stronger lane hover cues; auto‑scroll on drag.
- Compliance selector (FedRAMP tiers) validation pending.

## Next Steps
1) Collapsible Data Model cards with summary (name · model · consistency · size).
2) Architecture DnD improvements (lane hover + auto‑scroll).
3) Compliance selector + validations (Gov/family/residency).
4) Recommend services/SKUs from NFR + sizing; “Suggest Architecture”.
5) Telemetry connector stub and mock metrics for Inventory cards.

## Run / Validate Notes
- Dev: `cd frontend && npm run dev` → open printed URL (default http://localhost:5173/).
- Inventory: click “Inventory” (second tab); see joined strip, Overview, and ghost sections (Databases, Object & File Storage).
- NFR: open Cloud Architecture → Show Requirements; verify compact RPS, ms‑only latency with hint, single‑line growth/retention, SizeRange for item size, and textarea “Residency notes”.

### [2025-09-11T20:30:00Z] (event_type: ux, importance: high)
- Inventory tab added with joined strip and overview panel; grouped ghost cards for Databases and Object Storage.
- Tags: #inventory #ghost #joined-strip

### [2025-09-11T20:30:00Z] (event_type: implementation, importance: high)
- NFR input compaction (RPS, growth/retention) and ms‑only LatencyTargets with legacy conversion.
- Tags: #nfr #inputs #latency #compaction

### [2025-09-11T20:30:00Z] (event_type: implementation, importance: normal)
- Residency policy added to Project Settings; NFR residency switched to notes textarea.
- Tags: #residency #project-settings

### [2025-09-11T20:30:00Z] (event_type: troubleshooting, importance: normal)
- Sticky Architecture panel + joined‑strip seams corrected across tabs; Inventory icon adjusted.
- Tags: #layout #sticky #icons
