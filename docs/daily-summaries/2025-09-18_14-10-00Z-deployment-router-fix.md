# Daily Notes — 2025-09-18

## Deployment & Routing Fixes
- Frontend bundle now hard-codes `base: '/'` in `vite.config.ts` so Vite emits `/assets/...` paths; nginx serves assets correctly and the whitescreen on `/aib` is gone.
- React Router now redirects `/` → `/cloud-architecture` (`frontend/src/App.tsx`) and the layout header links directly to `/cloud-architecture`, so hitting `/aib` immediately lands on the correct view.
- Added wrapper scripts (`scripts/build-prod-images.sh`, `scripts/redeploy-prod.sh`, `scripts/build-and-deploy-prod.sh`) to rebuild/tag/push and redeploy phases 1–6 with a single command; phase 7 stays skipped since the portal manages the custom domain.
- Frontend Container App is running `ghcr.io/scottkollarik/tap-frontend:tap-prod-20250918-121314`; backend is on the matching tag.

## Remaining Notes
- Azure-managed certificate active via portal; phase 7 script now skips re-binding unless explicitly requested.
- `.deployment-status` file reset occurs when redeploying from later phases—combining rebuild and redeploy into the wrapper eliminates dependency failures.

## Next Steps
1. Keep using `./scripts/build-and-deploy-prod.sh` for production updates to ensure unique tags and full redeploy.
2. Add a proper landing page for the root domain (`https://www.technologoo.com/`) when ready—currently `/aib` is the shell entry point.
3. Continue refining NFR UX / recipe integration now that deployment is stable.
