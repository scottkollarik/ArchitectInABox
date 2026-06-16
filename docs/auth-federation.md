# Auth Federation — Design Note

**Status:** External tenant **provisioned** 2026-06-16; app registrations + providers next.
**Decision:** Use **Microsoft Entra External ID** as the single token issuer for all federated identity providers.

## Provisioned tenant (2026-06-16)

| | |
|---|---|
| Domain | `technologooext.onmicrosoft.com` (sign-in `technologooext.ciamlogin.com`) |
| Tenant ID | `a75b54b6-37ac-4b63-92fb-78fd35e1abe5` |
| Region | United States · Billing **MAU** (free tier) |
| ARM resource | `Microsoft.AzureActiveDirectory/ciamDirectories` in `rg-shared-services-free` (SKU `Base`/`A0`) |
| Strategy | **Consolidated brand tenant** — each product is its own app registration; AIB is the first. |

**Multi-product decision:** one brand tenant, products = separate app registrations (own clientId,
redirect URIs, scopes, branding). Rationale: cross-product SSO, one MAU pool (a user active in N
products = 1 MAU), central provider/policy config.

**Reversibility (why consolidated is safe to start with):** splitting one product's users out later
is a *bounded* migration — identify the population via the app registration's sign-in logs, recreate
in a new tenant keyed by **email**, social users re-consent (clean), local-account passwords reset
(no hash export). Splitting OUT is the easier direction; merging separate tenants back together is
worse. Keeping email required + per-app registration = "designed for divestiture".

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

## Where it lives (provisioning facts)

- The **external tenant** is a **separate Entra directory** — its own tenant ID, administered by
  switching directories in the portal / `*.ciamlogin.com`. It is **not** "inside" an RG the way a
  Container App is.
- The Azure **billing/link resource** is `Microsoft.AzureActiveDirectory/ciamDirectories`. That
  object goes in a normal RG — we'll use **`rg-shared-services-free`** (alongside APIM, vector
  Cosmos, Key Vault, etc.). None exists yet (checked 2026-06-16).
- **Region / data residency = United States**, chosen at creation and effectively permanent.
- **App registrations** (SPA + API) are created **inside the external tenant**, not the current
  workforce tenant.
- **Cost:** free at our scale via the **MAU-based free tier (~50k MAU)**. The RG name is
  organizational only and does not enforce free-ness.

## Migration steps (when we pick up infra)

1. **Provision** a free Entra External ID *external tenant* (confirm none exists first).
2. **App registrations:** SPA (public client, redirect `https://www.technologoo.com/aib/auth/callback`)
   and API (expose `user_impersonation` scope / audience).
3. **User flow:** sign-up/sign-in flow; add **Google** as the first federated provider; verify
   Microsoft accounts still flow through.
4. **Frontend:** env-driven *parallel* MSAL config (new authority/client ID) so we can test
   External ID without breaking the current Entra login. Toggle via build args.
5. **API token validation:** point validation at the External ID issuer + audience. Dual-issuer
   support is **optional** (testing convenience only) — see Cutover. Update `EntraAuthExtensions`.
6. **JIT verification:** confirm first sign-in upserts the user doc with claims from the new
   issuer; map provider-specific claim shapes (e.g., Google `email`/`name`) to `UserInfo`.

### Customer-facing naming (NOT the directory display name)

- The tenant **directory display name** (`Technologoo (External ID)`) is **admin/portal only** and
  **read-only after creation** (Graph `organization.displayName` rejects PATCH). The `(External ID)`
  suffix only helps admins tell tenants apart; customers never need to see it.
- What **customers** see is driven by:
  - **Company Branding** (`/organization/{id}/branding`) — sign-in page logo/background **and** the
    org identity in OTP/verification emails. Currently **unconfigured** (default). Set this to a
    friendly **"Technologoo"** + logo as part of app setup.
  - **App registration name** (e.g., `Architect-in-a-Box`) — shown on the **consent** screen per product.

### Required attributes — email is mandatory

`oid` is the canonical identity key, but **`email` is a required emitted claim** (for display,
notifications, support lookups, and a human-readable handle). This drives config:
- In the External ID **user flow**, mark email as a collected + emitted attribute.
- For each social provider, request the email scope (Google: `email`) so the claim is actually present.
- In prod, treat a token **without** an email claim as a misconfiguration → deny, do **not**
  synthesize a placeholder. (The current dev fallback's `{id}@example.com` synthesis must never
  run under External ID — it only exists for local development, already gated by `UserIdentityPolicy`.)

## Cutover — zero-state clean break (decided 2026-06-16)

There are **no real users yet**, so we skip all identity migration:
- No `oid` re-keying, no email-linking, no dual-key reconciliation. Everyone (Scott included)
  re-authenticates fresh under External ID on first access; the JIT upsert creates the user doc
  with the External ID `oid` as the canonical key from day one.
- Because of this, the API can **hard-cut** to the single External ID issuer; dual-issuer is only
  worth wiring if we want to test both side-by-side before flipping prod.
- **Cleanup caveat:** a clean break orphans any existing project/ACL records keyed to old
  workforce `oid`s (e.g., throwaway test projects). At cutover either wipe the `users` and
  `projects` collections for a true zero-state, or accept the harmless orphans.

## Testing plan

- Unit: issuer/audience validation accepts External ID, rejects others (extend auth tests).
- Unit: claim mapping for each provider → `UserInfo` (Google, MS personal, MS work).
- Integration: end-to-end sign-in per provider → `/me` returns correct identity →
  user doc JIT-created exactly once.
- Negative: token from old issuer rejected once migration completes; tampered/expired token → 401.
- Negative: token missing the `email` claim is rejected (no placeholder synthesis in prod).

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
