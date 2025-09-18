# Daily Summary — 2025-09-12

### [2025-09-12T18:30:00Z] (event_type: ux, importance: high)
- NFR form compaction and structure improvements.
- Added dual-unit `SizeRange` (separate Min/Max units) and right-sized long inputs (compact widths, tightened selects).
- Card list composer for “Data Models”: fields appear first with Add button directly beneath; supports `numeric-with-units` inside cards and legacy value parsing.
- Adjusted Azure Region selects to avoid full-width stretch.
- Tags: #frontend #nfr #ux

### [2025-09-12T19:10:00Z] (event_type: data-model, importance: high)
- Reorganized “Data & Consistency”: added “Global Defaults and Policies” subheading above “Data Models”.
- Globals prefill per-model (e.g., default consistency). Labels clarified to indicate workload-wide scope.
- Kept per-model specifics inside cards; reduced overlap/confusion between global/per-model fields.
- Tags: #information-architecture #nfr

### [2025-09-12T19:35:00Z] (event_type: recipes, importance: normal)
- Introduced NFR “recipes” (OLTP Standard, Read-heavy Analytics, Event Streaming) for opinionated defaults.
- Selector added in Project Settings; applies non-destructively on load; integrates with existing globals.
- Files: `frontend/src/modules/cloud-architecture/data/recipes.ts`, Project Settings wiring.
- Tags: #defaults #recipes #frontend

### [2025-09-12T20:00:00Z] (event_type: governance, importance: high)
- Blueprint enforcement model settled: no in-app overrides; only portal-driven unlocks. Disassociation allowed with warning.
- Added `nfrLocks` to constraints; import parses locks; NFRAssessment enforces locked/policy-only on global and per-model consistency.
- Project Settings shows blueprint active banner and confirmation on clear.
- Tags: #blueprint #locks #governance

### [2025-09-12T20:30:00Z] (event_type: backend, importance: high)
- Artifact storage added with Azure Blob (prod) and Azurite (dev). Endpoints: list, download, upload (multipart `file`).
- Category metadata supported end-to-end; recommend catch-all project prefix + category filtering.
- Files: Artifact store interfaces/implementations and Minimal API routes.
- Tags: #artifacts #azure-blob #azurite #api

### [2025-09-12T20:45:00Z] (event_type: infrastructure, importance: high)
- Docker Compose updated: fixed Azurite service, added MongoDB service with volume and auth. Backend now depends on `azurite` and `mongodb`.
- Backend connection string points to in-network MongoDB.
- Tags: #docker #mongodb #dev-env

### [2025-09-12T21:05:00Z] (event_type: schema, importance: high)
- Added versioned backend DTOs: Project, Blueprint, NFR, Artifact (with namespacing fields and `schemaVersion`).
- Checked-in JSON Schemas for core records; added placeholder for OpenAPI export and script to fetch swagger.
- Tags: #schema #versioning #openapi

### [2025-09-12T21:25:00Z] (event_type: roadmap, importance: normal)
- Planning: move “Data & Modeling” to its own tab; add “Regulatory” tab with control checklists and evidence capture.
- Education: create Data Guide drawer with concise hints (blueprints, recipes, per-model vs global, artifacts).
- Tags: #roadmap #ux #docs

### [2025-09-12T21:40:00Z] (event_type: rag, importance: normal)
- RAG/vectorization approach outlined: extract → chunk → embed → index.
- Data model extensions proposed: artifact extraction/embedding statuses, vectorized chunks; per-project (later org) RAG settings; blueprint locks for RAG enablement/provider.
- Pluggable adapters (Azure AI Search, Atlas Vector, pgvector, FAISS) with background worker pipeline.
- Tags: #rag #vector #search #blueprint

### [2025-09-12T22:00:00Z] (event_type: architecture, importance: normal)
- Org model deferred but future-proofed: added owner namespacing (`ownerScope`, `ownerId`, optional `orgId`) to schemas to “light up” orgs later without migrations.
- Tags: #orgs #namespacing #future-proofing

