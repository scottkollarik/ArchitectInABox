# Auth Federation — Design Note

**Status:** Approved direction, infra deferred · **Date:** 2026-06-16
**Decision:** Use **Microsoft Entra External ID** as the single token issuer for all federated identity providers.

---

## Goal

Let users sign in through many providers (Google, Microsoft work/school, Microsoft
personal, later Apple/SAML partners) while the **API trusts exactly one issuer** and
user records are provisioned **just-in-time (JIT)** on first authenticated call.

## Two layers of truth (keep them separate)

| Layer | Owner | Notes |
|---|---|---|
| **Authentication truth** | Entra External ID (one OIDC issuer) | All providers federate *into* it. The SPA uses one MSAL config; the API validates one issuer + audience. Credentials never live in our DB. |
| **App / profile truth** | Our datastore (Cosmos/Mongo `users`) | JIT-upserted on first authenticated `/me` call (existing `IUserRepository.UpsertUserAsync`). Owns app roles, onboarding state, profile. Reconciled from token claims, never the source of credentials. |

"Single point of JIT truth" = identity is asserted by **one** issuer; the app-side user
doc is a projection created/refreshed JIT and is the authorization/profile source.

## Why Entra External ID

- Native to our Azure/Entra stack; **MSAL works unchanged** (just a new authority + client ID).
- Federates social (Google/Apple) **and** Microsoft accounts into one issuer.
- Free up to ~50k MAU — fits the cost policy (cheapest viable tier first).
- B2C is the legacy predecessor; Microsoft steers new builds to External ID. Third-party
  (Auth0/Okta) rejected to stay inside Azure cost/governance. Direct multi-issuer
  validation in the API rejected — it defeats the single-source-of-truth goal.

## Current state (baseline to migrate from)

- SPA: MSAL with authority `https://login.microsoftonline.com/common` → already accepts
  MS work/school + personal accounts, but **not** Google/social.
- API: validates `EntraAuth:ClientId` / `EntraAuth:TenantId` (from `VITE_OAUTH_*` env on the
  backend Container App). `authEnabled` gates `RequireAuthorization` on `/api`.
- Identity resolution now **fails closed** outside Development (`UserIdentityPolicy`).
- JIT upsert already happens in `GetUserAsync` → `UpsertUserAsync`.

## Migration steps (when we pick up infra)

1. **Provision** a free Entra External ID *external tenant* (confirm none exists first).
2. **App registrations:** SPA (public client, redirect `https://www.technologoo.com/aib/auth/callback`)
   and API (expose `user_impersonation` scope / audience).
3. **User flow:** sign-up/sign-in flow; add **Google** as the first federated provider; verify
   Microsoft accounts still flow through.
4. **Frontend:** env-driven *parallel* MSAL config (new authority/client ID) so we can test
   External ID without breaking the current Entra login. Toggle via build args.
5. **API token validation:** accept the External ID issuer + audience. Support **both** issuers
   during migration (additive), then drop the old one. Update `EntraAuthExtensions`.
6. **JIT verification:** confirm first sign-in upserts the user doc with claims from the new
   issuer; map provider-specific claim shapes (e.g., Google `email`/`name`) to `UserInfo`.

## Testing plan

- Unit: issuer/audience validation accepts External ID, rejects others (extend auth tests).
- Unit: claim mapping for each provider → `UserInfo` (Google, MS personal, MS work).
- Integration: end-to-end sign-in per provider → `/me` returns correct identity →
  user doc JIT-created exactly once.
- Negative: token from old issuer rejected once migration completes; tampered/expired token → 401.

## Open questions

- One external tenant for all envs, or separate dev/prod tenants?
- Custom domain for the CIAM sign-in pages (branding) vs default `*.ciamlogin.com`?
- Pair with the APIM front door (`apim-technologoo`, Consumption) so `validate-jwt` enforces the
  single issuer at the gateway *and* the API — and flip backend ingress to internal. See the
  separate APIM hardening track.

## Related hardening (separate tracks)

- ✅ **Fail-closed identity** (`UserIdentityPolicy`) — done 2026-06-16.
- ⬜ **APIM front door** — import backend, `validate-jwt` policy, internal ingress, repoint
  `VITE_API_URL` at the gateway.
