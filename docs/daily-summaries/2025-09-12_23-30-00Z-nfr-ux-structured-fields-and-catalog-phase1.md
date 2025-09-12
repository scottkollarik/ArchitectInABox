# Daily Summary — 2025-09-12 — NFR UX, Structured Fields, and Catalog Phase 1

## Highlights
- Added slider control for Read/Write ratio (5% steps) with constrained width and aligned labels.
- Tightened layouts for compact, single-row inputs (latency P95/P99, size ranges, percentage split).
- Converted Transactions and Analytics/Search NFRs from freeform to structured, inline fieldsets with Notes.
- Implemented stable on-blur validation pattern (warn, no refocus, do not persist invalid values).
- Fixed label `htmlFor` mapping for composite inputs to improve a11y/autofill.
- Expanded catalog (Functions, Event Hubs, ADLS Gen2, Databricks, Synapse, APIM, Logic Apps, Confluent Kafka, Snowflake) and tied to NFR-driven recommendations.
- Alignment Report reads richer NFR shapes; Suggestions merged (NFR + contextual) with per-chip add and filter.
- DnD stability and duplicate prevention across add/rehydrate/grouping.
- Blueprint import moved to Project Settings; enforced constraints in Browser + Suggestions.

## UX / Inputs
- Read/Write Ratio
  - Slider mode (0–100 by 5). The slider controls Writes%; Reads% = 100 − Writes%.
  - Constrained width: `w-1/3` with min/max; labels aligned above the slider.
- Latency Targets
  - P95/P99 rendered side-by-side (narrow inputs), smaller gaps; numeric validation on blur (no refocus).
- Size Range (Item/Document)
  - Min/Max/Unit tightened into a single compact row; sanitized inbound values; commit only numeric or blank.
- Numeric With Units
  - Single-unit controls now render a compact badge instead of a dropdown; smaller paddings and inline alignment.
- Percentage Split (inputs)
  - Controlled values avoid undefined/NaN; total helper retained.

## Structured NFR Fields
- Transactions (ACID scope)
  - Fields: scope, consistency, % in transaction, max duration (s), Notes (textarea).
  - Inline layout; compact controls; migration moves legacy text into Notes.
- Search / Analytics / Reporting
  - Fields: use-cases (multiselect), freshness, daily ingest, dataset size, platform pref (multiselect), Notes.
  - Inline layout; multiselect and Notes span full-width rows; compact numeric/selects inline.

## Catalog + Recommendations (Phase 1)
- New catalog entries: Azure Functions, Event Hubs, ADLS Gen2, Databricks, Synapse, API Management, Logic Apps, Confluent Kafka (partner), Snowflake (partner).
- Recommendation rules:
  - Serverless acceptable → Functions; Compute prefs preserved.
  - Async/queue/event → Service Bus; streaming/high RPS → Event Hubs.
  - BI/SQL/reporting → Synapse; ETL/ML → Databricks; analytics present or data growth → ADLS Gen2.
  - Heavy read (≥80%) or latency-sensitive → Redis Cache.

## Alignment & Suggestions
- Alignment Report: shows NFR summary, matched/missing; quick actions to filter or add all.
- Suggestions: merged NFR-driven + contextual deps; per-chip “+” add; filter missing.

## Stability Fixes
- Prevent duplicate keys by deduping selected services on add/rehydrate/group.
- One-time project rehydrate in NFR form to avoid wiping user input mid-typing.
- Controlled/uncontrolled and NaN value warnings resolved for PercentageSplit and SizeRange.

## Outstanding / Next
- Item/Document size (document-size) requested dual-unit (Min ___ Unit, Max ___ Unit) — pending schema/control update.
- Replace Request Patterns (idempotency/long-polling/streaming) text with a structured fieldset.
- Add a constraints badge + lock indicators when a blueprint is active.
- Optional: toggle to opt-in partner/external services in Project Settings.

