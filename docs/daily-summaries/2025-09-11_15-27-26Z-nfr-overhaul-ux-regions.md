# Daily Summary — NFR Overhaul, Canvas UX, Regions

### [2025-09-11T15:27:26Z] (event_type: architecture, importance: high)
- Planned multi‑level NFR structure (Project baseline, Regional requirements, Workload, Data source) and precedence to drive compute, data, networking, DR, and security selections.
- Introduced project profiles (starter/standard/enterprise) for right‑sized information gathering with progressive disclosure and sensible defaults.
- Tags: #nfr #architecture #ux #profiles

### [2025-09-11T15:47:26Z] (event_type: implementation, importance: high)
- Converted key NFR inputs to structured controls:
  - Avg/Peak RPS split, latency P95/P99 with units, read/write ratio, data growth & retention, monthly budget.
- Added smart data‑model configuration via conditional fieldsets (SQL/Document/Blob specific fields and defaults).
- Tags: #forms #validation #structured-inputs

### [2025-09-11T16:07:26Z] (event_type: implementation, importance: high)
- Architecture panel visual redesign:
  - Replaced cloned cards with compact chips, added info drawer.
  - Sectioned by category (Compute, Databases, Object/File Storage, etc.).
  - Per‑category drop lanes; type‑safe drops.
- Persisted selected services per project; rehydrate on load.
- Tags: #dnd #ux #persistence

### [2025-09-11T16:27:26Z] (event_type: implementation, importance: high)
- Azure Region Selector added with paired‑region guidance.
- Introduced US Gov sovereign family with same‑family pairing and manual secondary filtering.
- Plan to move Cloud/Regions to Project Settings (top‑level) and filter catalog by cloud family.
- Tags: #azure #regions #sovereign #gov

### [2025-09-11T16:42:26Z] (event_type: roadmap, importance: normal)
- Next: Project Settings for Cloud/Regions/Policies, catalog availability filtering (Gov), compliance selector (FedRAMP), chip reorder/move, recommendations mapping → Bicep/ACA/AKS generators.
- Tags: #roadmap #governance #generation
