# Matjari subscription payment requests

Before enabling this release, apply `migrations/0003_subscription_payment_requests.sql` to the D1 database bound to the main Daidar site as `ECOSYSTEM_STORE_DB`.

Use the Cloudflare Pages project for `daidarsoluations.com` and select that exact store database. Do not apply this migration to `ECOSYSTEM_HUB_DB` or to an isolated preview database. The deployment build does not run D1 migrations automatically.

Verify the table exists in the selected D1 database:

```sql
SELECT name FROM sqlite_master
WHERE type = 'table' AND name = 'subscription_payment_requests';
```

Payment proof images are stored in this table as private base64 data, limited to PNG, JPEG, or WEBP images up to 1 MiB. Only the central platform administrator endpoints can list requests or retrieve receipts. Approving a request activates the store and starts a one-month subscription; annual domain selection and its paid-through date are recorded in subscription notes for manual domain setup.
