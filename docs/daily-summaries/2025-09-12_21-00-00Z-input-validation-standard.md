# Daily Summary — 2025-09-12 — Input Validation Standard

Highlights
- Established a consistent on-blur validation pattern for numeric inputs across the NFR form.
- Added inline error messages and focus return to offending fields to prevent invalid entries from lingering.
- Extended Suggestions and Alignment flows; added Alignment Report drawer; moved Blueprint import to Project Settings.

Input Validation Pattern (adopted going forward)
- On blur, validate field content; if invalid, show an inline error and focus the field.
- For numeric text fields, accept digits and commas while typing; convert/format on blur; reject non-numeric.
- For cross-field relationships, surface clear guidance (e.g., Avg RPS ≤ Peak RPS, P95 < P99).

Components updated today
- Avg/Peak RPS (new): `frontend/src/modules/cloud-architecture/components/inputs/AvgPeakRps.tsx`
  - Digits + commas, commify on blur, enforce avg ≤ peak, focus on error.
- LatencyTargets: `frontend/src/modules/cloud-architecture/components/inputs/LatencyTargets.tsx`
  - Per-field numeric validation + inline errors; keeps P95 < P99 check.
- SizeRange: `frontend/src/modules/cloud-architecture/components/inputs/SizeRange.tsx`
  - Per-field numeric validation + inline errors; retains min ≤ max check.
- NumericWithUnits: `frontend/src/modules/cloud-architecture/components/inputs/NumericWithUnits.tsx`
  - Numeric validation on blur with inline error and focus.

Process note
- Apply this validation pattern to any new numeric inputs added to the NFR form or sub-tools.
- Favor progressive disclosure: keep immediate feedback local to the field; avoid blocking other inputs.

Related UX changes
- Suggestions panel includes contextual deps; per-chip “+” add.
- Alignment Report drawer summarizes NFRs and matched/missing; includes quick actions.
- Blueprint import moved to Project Settings and enforced in Browser + Suggestions.

