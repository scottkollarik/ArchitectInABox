# Daily Notes — 2025-09-19

## Authentication Locked Down
- Entra MSAL flow is live end-to-end: bundles now include `VITE_OAUTH_*` at build time, the container app serves `/auth/callback`, and redirect URIs for `www.technologoo.com` are registered on the app.
- Phase 6 scripts auto-append custom redirect URIs when `VITE_OAUTH_CLIENT_ID` is provided.
- Build scripts force linux/amd64 output so Container Apps accept every deployment.

## Multi-User Data Separation Plan
- Projects already expose `OwnerScope`/`OwnerId`; backend handlers filter on both fields. Need to propagate the authenticated Entra user to those handlers instead of the dev headers.
- Extend all project/NFR mutations (`POST/PUT /projects`, `/projects/{id}/nfr`) to ignore client-provided `OwnerId` and enforce the authenticated identity server-side.
- Introduce owner checks when fetching NFR assessments; either embed `OwnerId` on the NFR document or join back to the parent project before serving data.
- Update Mongo/Cosmos indexing if we pivot collections: partition on `(OwnerScope, OwnerId)` so per-user scans stay efficient.
- Add audit timestamps (`CreatedBy`, `LastModifiedBy`) in anticipation of shared projects and support workflows.

## Profile & Onboarding UX
- New Settings/Profile surface: show display name, email, tenant, plan tier, and editable preferences (time zone, notifications, UI theme).
- First-run wizard: capture profile basics, create starter project, walk through NFR form, flag completion so we tailor later guidance.
- Persist onboarding progress alongside profile data (e.g., `onboardingComplete`, `lastVisitedStep`).

## Teardown & QA
- Expand `scripts/azure/teardown.sh` to support `--keep-data` vs full wipe; validate the path after the next deploy.
- Document teardown in the deployment guide so rollback is as simple as deployment.

## Next Actions
1. Wire Entra-authenticated user context into backend API (per-request identity) and lock down project/NFR handlers.
2. Update database schema/indexing where necessary for per-user filtering and audit fields.
3. Design profile settings UI and onboarding wizard flows.
4. Enhance teardown logic/flags; dry-run the full teardown to ensure idempotent cleanup.

## Implementation Progress
- Backend now enforces owner/collaborator access for projects and NFR data using in-document ACLs.
- API exposes share management endpoints (`GET/POST/DELETE /projects/{id}/shares`).
- Next step: flow access tokens from Entra auth to the backend so we can remove the temporary ownerScope/ownerId query inputs.
