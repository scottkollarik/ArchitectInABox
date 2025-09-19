# Daily Notes — 2025-09-19

## Entra Auth Integration Finalized
- Frontend is now gated by MSAL: `ProtectedRoute` wraps the app, `EntraAuthProvider` loads MSAL config, and `/auth/callback` handles post-login handoffs.
- Vite build now accepts `VITE_OAUTH_*` variables via Docker build args; `frontend/Dockerfile` exports them so bundles contain the Entra client/tenant IDs and redirect URI.
- Rebuilt/pushed linux/amd64 frontend image (`ghcr.io/scottkollarik/tap-frontend:tap-prod-20250918-NEW`) and rolled the Container App so MSAL receives the proper `client_id`.
- Container App env vars aligned with `.env.production` (`VITE_API_URL`, `VITE_BASE_PATH`, `VITE_OAUTH_*`), ensuring runtime parity with the build.
- Restored `www.technologoo.com` custom domain: cleaned the stale managed certificate, added the hostname, recreated the cert, and rebound it to the frontend app.
- Updated Entra app registration with the production redirect URI, unblocking the auth loop end-to-end.

## Automation Enhancements
- `scripts/build-containers.sh` now forces linux/amd64 builds and forwards the Vite OAuth build args automatically.
- Phase 6 (`deploy-phase6-user-access.sh`) reads `VITE_OAUTH_REDIRECT_URI` when provided and attempts to append it to the Entra app registration so manual portal edits are no longer required.
- Deployment guide updated to highlight the amd64 build requirement and the automated redirect update.

## Roadmap / Next Steps
1. Update Phase 7 custom-domain script to align with the latest `az containerapp` CLI syntax (hostname add + certificate create flow).
2. Expand teardown script to support `--keep-data` / `--full-wipe` modes and validate the end-to-end teardown path.
3. Plan the transition to private network access (VNET + private endpoints) once the current release stabilizes.
4. Capture the new frontend image workflow (buildx push with Vite auth args) in the release checklist.
