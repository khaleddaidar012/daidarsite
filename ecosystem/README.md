# Daidar Ecosystem — preview rollout

The pilot runs on `feature/matjari-hub` only. Production Hub and its database are not part of this rollout.

## Architecture

- `shared/ecosystem.ts`: shared identity, host-only HttpOnly sessions, single-use SSO codes with state and PKCE, Google OIDC, device authorization, roles and audit.
- `shared/ecosystem-subscriptions.ts`: central subscription actions backed by the original system databases. Operation IDs and absolute targets make retries safe. Payment confirmation and license issuance remain separate operations.
- `functions/lib/ecosystem.ts` and `matjari/lib/ecosystem.ts`: source-specific user and subscription adapters.
- `shared/EcosystemPanel.tsx` and `shared/EcosystemAdmin.tsx`: account navigation and platform administration.
- `desktop/daidar-flow/src/main/ecosystem.ts`: encrypted desktop account connection; does not grant paid features.

Accounts are enrolled on credential-proven login. An identical email never merges accounts. Linking a legacy account requires its password and an explicit selection while signed into the target central identity. Only the configured existing Store owner ID receives platform administration; email matching cannot grant it. Source roles remain source scoped.

## Preview configuration

Hub origin: `https://feature-matjari-hub.daidarsite2.pages.dev`

Store origin: `https://daidar-matjari-preview.pages.dev`

Both runtimes bind the same `ECOSYSTEM_DB`, the isolated Hub database as `ECOSYSTEM_HUB_DB`, and Store preview database as `ECOSYSTEM_STORE_DB`. Their local `DB` remains system specific. Hub Preview must use the isolated Hub database, never the main site database.

Set `ECOSYSTEM_CLIENT`, `ECOSYSTEM_HUB_ORIGIN`, `ECOSYSTEM_STORE_ORIGIN`; Store additionally sets `ECOSYSTEM_OWNER_LOCAL_ID` to its pre-existing owner local ID. Hub build sets `NEXT_PUBLIC_ECOSYSTEM_ENABLED=1` and `NEXT_PUBLIC_MATJARI_URL` to the Store origin. Secrets are never committed.

Google runs through Hub Preview with `HUB_GOOGLE_CLIENT_ID` and encrypted `HUB_GOOGLE_CLIENT_SECRET`. Authorized JavaScript origin is the Hub origin without a trailing slash; authorized redirect is that origin plus `/api/ecosystem/google/callback`. Real Google callback verification requires a user-mediated Google sign-in; a successful authorization redirect alone is not an end-to-end sign-in.

## Data migration and rollback

1. Back up each source database before changes. Store preview export was restored in memory and row counts checked before this rollout.
2. Apply `migrations/0001_identity.sql` only to the new identity database. Statements are idempotent. Do not run it on the source databases.
3. Deploy both adapters with the correct isolated bindings. Existing source users and subscriptions are retained. Enrollment and registry publication occur on verified login/session refresh; no bulk email matching.
4. Verify SSO, source access checks, account linking, logout, device authorization, subscription retries and tenant isolation before extending the rollout.
5. To roll back, restore the previous deployment on both preview projects and their prior bindings/variables. Keep identity tables and source data for investigation; do not drop tables or overwrite source databases. Legacy sessions were invalidated during enrollment, so users may need to log in again. Any explicitly applied subscription change must be reconciled from its audit entry; rolling back code does not reverse it.

## Verification

`node scripts/test-ecosystem.cjs` covers PKCE, code replay, explicit linking, permissions, idempotent subscription actions, signed Google token validation and device authorization.

`node scripts/test-flow-ecosystem.cjs` covers the desktop token boundary, encrypted persistence, offline cache, remote revocation and failed logout. Existing Admin, Hub and Store suites cover legacy behavior with the pilot disabled. Both web builds and the Flow preview build are checked separately.

## Remaining rollout boundaries

- The central registry discovers source subscriptions as linked users visit their accounts; it is not a bulk migration of all historical customers.
- Source subscription renewal does not mint a Flow desktop license. Existing offline Ed25519 trust and license checks remain authoritative. Automated signed license delivery needs a compatible issuance policy and a separate key handling decision.
- No production customer accounts or subscriptions have been migrated by this pilot. Production rollout requires a reviewed mapping, backups, verification and rollback window.
- The Flow bundle was compiled and unit tested without downloading or running Electron. An installed desktop end-to-end check remains necessary before distributing it to users.
