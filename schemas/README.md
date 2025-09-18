Schemas for persisted payloads.

- project.schema.json: Project record shape (namespaced, versioned)
- nfr.schema.json: NFRAssessment shape
- blueprint.schema.json: Blueprint and constraints
- artifact.schema.json: Artifact metadata

Notes
- All records include `schemaVersion` for in-data versioning.
- Prefer additive changes; use migrations for breaking changes.
