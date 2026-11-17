# Store domains

The merchant searches Cloudflare Registrar, confirms live availability and a server-calculated first-year quote, then uploads a private transfer receipt. Platform administrators review payment, purchase manually in Cloudflare, verify account ownership, attach the domain to Pages and create its CNAME. The application never calls the billable registration POST endpoint.

## Production configuration

Apply `matjari/migrations/0005_domain_requests.sql` once to the existing store database bound as `ECOSYSTEM_STORE_DB` on the main Pages project. Inspect `sqlite_master` first; do not replay older migrations or apply this to the Hub database. The build does not apply migrations.

Set the following on the **main Pages project**, production environment:

- `DOMAIN_CF_ACCOUNT_ID`: Cloudflare account containing the purchased domains and Pages project.
- `DOMAIN_CF_API_TOKEN`: encrypted secret, never a Vite variable. Cloudflare's Registrar beta documentation requires Registrar write permission even for its search/check workflow. Also allow Pages edit, Zone read and DNS edit for the domains being managed. The app uses only search/check/read operations in Registrar; purchase remains manual.
- `DOMAIN_PAGES_PROJECT`: existing Pages project name (`daidarsite2` for the current main site, confirm before setting).
- `DOMAIN_ROUTING_ENABLED=1`: enable only after migration and deployment of `functions/_middleware.ts` and the all-path `public/_routes.json`.

Existing main hostnames and project preview hostnames retain normal routing. Other hostnames require an exact `domain_requests` mapping in linking/active state. Customer hosts expose only the mapped public storefront, its assets, catalog reads, visits and order submission. Admin/auth endpoints are unavailable there, and foreign store IDs and session headers are removed. Current implementation targets the main Hub Pages project, not the separate Matjari preview project.

Cloudflare account billing, default registrant contact and registration agreement must be configured in the Cloudflare dashboard. Purchase the exact name shown on the request, then use **Purchased — verify account**. The registration must exist and be active. **Connect store** attaches the hostname to Pages and creates a CNAME to `<project>.pages.dev`; it refuses to replace existing A/AAAA/conflicting CNAME records. Retry is safe after partial failure. **Check activation** waits for Cloudflare's active status. This release connects the exact purchased apex name; it does not add a `www` alias automatically.

## Pricing and transfers

Initial settings: USD selling rate **53.8626 EGP**, dated **2026-11-15**, plus **150 EGP** per domain. Source checked on 2026-11-16: [Central Bank of Egypt](https://www.cbe.org.eg/en/economic-research/statistics/cbe-exchange-rates). These are editable administrator settings, not an automatic exchange-rate feed. Quote = registration USD × configured USD/EGP + fixed EGP margin, rounded up to the next piastre. The first year and indicative renewal price are distinct; renewals are not automatic.

Quotes are valid for transfer for 30 minutes and do not reserve names. Store the immutable cost, FX and margin snapshot before showing payment instructions. Late receipts remain accepted for manual follow-up; they do not silently reprice or purchase. InstaPay: 01092912431; Vodafone Cash: 01061532875. Receipt uploads use the existing PNG/JPEG/WEBP validator and 1 MiB limit, stored privately in D1. Only administrators can retrieve receipts. A partial unique index prevents two live paid requests claiming one hostname.

The former 600 EGP domain subscription add-on is removed for new requests. Existing subscription receipts retain their original review and accounting behavior.

## Validation

`node scripts/test-domains.cjs` runs SQLite-backed API and middleware tests with mocked Cloudflare responses. No real domain is purchased and no live DNS is modified. `node scripts/test-matjari.cjs` covers existing store/auth/subscription behavior. Build both the Matjari bundle mounted in Hub and the Next site before publishing. Production success still requires configured secrets and a real search plus an owned test domain to verify HTTPS routing.

API references: [Registrar workflow](https://developers.cloudflare.com/registrar/registrar-api/), [registration lookup](https://developers.cloudflare.com/api/resources/registrar/subresources/registrations/methods/get/), [Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

## Existing and test addresses
Apply 0006_existing_domain_links.sql once to the same store database. Existing-domain connections live in store_domain_links, independently of purchase requests. Administrators can connect from each domain request or the merchant table's Domain settings button. The server resolves the longest active parent zone in the configured Cloudflare account, supports subdomains, refuses conflicting DNS and cross-store claims, and never changes the purchase/payment status. The exact hostname is routed to its store; the main platform hostname and pages.dev addresses are reserved. A linking record is retained after partial external failure so the same store can retry safely. Migration applied to production on 2026-11-17; no test hostname has been created automatically.
