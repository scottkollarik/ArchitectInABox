# Chat Context — 2025-09-12 (Refresh)

## Scope
- NFR form UX compaction, validation, and structured fields
- Alignment Report + Suggestions integration
- Catalog Phase 1 additions + recommendations
- Project-level constraints (Blueprint) and Inventory seed

## Key Changes
- Slider for Read/Write ratio (5% step, constrained width) — `PercentageSplit.tsx`; used by `read-write-ratio` in `NFRAssessmentForm.tsx`.
- Compact inputs: LatencyTargets (P95/P99), SizeRange (min/max/unit), PercentageSplit (inputs).
- Structured NFRs:
  - Transactions (tx-scope, consistency, tx-frequency %, tx-duration s, notes) — `nfrData.ts` + inline fieldset.
  - Search/Analytics (use-cases, freshness, daily-ingest, dataset-size, platform-pref, notes) — `nfrData.ts` + inline fieldset.
  - Notes render as textarea; full-row in inline layout — `ConditionalFieldSet.tsx`.
- Label `htmlFor` now targets first interactive control for composite inputs — `NFRAssessmentForm.tsx`.
- Validation: on blur warn; no refocus; do not persist invalid — `AvgPeakRps.tsx`, `LatencyTargets.tsx`, `SizeRange.tsx`, `NumericWithUnits.tsx`.
- Catalog additions: Functions, Event Hubs, ADLS Gen2, Databricks, Synapse, APIM, Logic Apps, Confluent Kafka, Snowflake — `azureServices.ts`.
- Recommendations updated for serverless/messaging/analytics/read-heavy → `azureServices.ts`.
- Alignment Report drawer + Suggestions (merged NFR + contextual deps) — `AlignmentReportDrawer.tsx`, `CloudArchitecturePage.tsx`.
- DnD and dedupe hardening — `ArchitectureCanvas.tsx`.
- Blueprint import → Project Settings; constraints enforced in Services Browser + Suggestions — `ProjectSettingsModal.tsx`, `AzureServicesBrowser.tsx`, `CloudArchitecturePage.tsx`.
- Inventory demo seed (SQL, Cosmos, Blob, Files) — `InventoryPage.tsx`.

## Open Items / Next
- Item/Document size: split units per Min/Max (Min ___ Unit, Max ___ Unit) — add dual-unit control.
- Request patterns (idempotency/long-polling/streaming): replace freeform with structured (idempotency, patterns, durations, concurrency, msg size) + rec hooks.
- Constraints badge + per-service lock indicator when blueprint active.
- Optional: partner/external services opt-in toggle (hide by default).

## Files of Interest
- Form: `frontend/src/modules/cloud-architecture/components/NFRAssessmentForm.tsx`
- Inputs: `inputs/PercentageSplit.tsx`, `inputs/LatencyTargets.tsx`, `inputs/SizeRange.tsx`, `inputs/NumericWithUnits.tsx`, `inputs/AvgPeakRps.tsx`, `inputs/ConditionalFieldSet.tsx`
- Data: `data/nfrData.ts`, `data/azureServices.ts`
- Pages: `pages/CloudArchitecturePage.tsx`, `modules/inventory/pages/InventoryPage.tsx`
- Project: `components/ProjectSettingsModal.tsx`, `context/ProjectContext.tsx`
- Alignment: `components/AlignmentReportDrawer.tsx`

## Quick Setup (Dev)
- Vite app at http://localhost:5173/
- Cloud Architecture → NFR form on left; “Your Services” on right (sticky) with Suggestions and Alignment Report.
- Inventory tab shows ghost cards; connects to Architecture selection.

