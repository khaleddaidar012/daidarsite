# Daidar Flow architecture

Electron + React 18 + TypeScript + Vite in an isolated package. Existing Next.js/Cloudflare code is not embedded or migrated. All runtime assets are local and connect-src is none. Node 22.12+ or 24 LTS for development; Windows 10/11 x64 is the initial test target.

- main: app lifecycle, protocol, IPC sender validation, future trusted services.
- preload: narrow typed bridge; no generic invoke or filesystem access.
- renderer: RTL presentation only; no Node integration or business authority.
- shared: serializable contracts and feature policy.
- SQLite: selected future local source of truth behind main/services; no sales DB or SQLite dependency now. Transactions, migrations and explicit export/backup policy precede future modules. Cloud sync is a separate opt-in adapter with conflict handling and retry queues, not a UI dependency.

## Future licensing (design only)
Free: inventory, sales, POS. Paid: feature entitlements for 1/3/6/12 calendar months, validated in main per protected operation. Existing Hub already has a different activation/Ed25519 contract: reconcile protocol/version, durations and device transfer with that server before implementation; do not silently change Hub.

Device identity should combine a locally generated installation identity protected by Windows DPAPI with hashed suitable machine identifiers (e.g. MachineGuid and SMBIOS UUID when available). Never rely on MAC alone. Handle missing/virtual identifiers, component replacements and privacy explicitly. Hardware matching tolerance and administrator-approved device transfer are policy decisions to test before shipping.

An independent administrator tool holds an Ed25519 private key outside the client and source repository. A versioned signed license binds license ID, device fingerprint, start/end, plan and permitted features; client carries only the verification public key. Sign canonical bytes, bound import sizes and schema, and reject tampering. This phase creates no keys, device IDs or licenses.

Time: server-signed trusted timestamps when online; protected last-seen time plus monotonic elapsed time within a session and a defined offline grace policy. Clock rollback triggers review/revalidation rather than deleting data. Five-day warning with days/hours/date and renewal; expired paid features lock while free features and permitted export remain. Fully offline tamper resistance cannot be guaranteed.

Security later: baseline protection for every edition, DPAPI-managed encryption keys, vetted database encryption, optional advanced key management, signed installers and updates, integrity checks, fuses and suitable obfuscation. Obfuscated JavaScript is not a security boundary. No installer or license implementation in tasks 01–10.

References: https://www.electronjs.org/docs/latest/tutorial/security and https://vite.dev/guide/ (reviewed 2026-10-31).
