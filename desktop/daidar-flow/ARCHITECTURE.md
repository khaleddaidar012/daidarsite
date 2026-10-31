# Daidar Flow architecture

Electron + React 18 + TypeScript + Vite in an isolated package. Existing Next.js/Cloudflare code is not embedded or migrated. All runtime assets are local and connect-src is none. Node 22.12+ or 24 LTS for development; Windows 10/11 x64 is the initial test target.

- main: app lifecycle, protocol, IPC sender validation, future trusted services.
- preload: narrow typed bridge; no generic invoke or filesystem access.
- renderer: RTL presentation only; no Node integration or business authority.
- shared: serializable contracts and feature policy.
- SQLite: selected future local source of truth behind main/services; no sales DB or SQLite dependency now. Transactions, migrations and explicit export/backup policy precede future modules. Cloud sync is a separate opt-in adapter with conflict handling and retry queues, not a UI dependency.

## Licensing implemented in Tasks 11–16
Free: inventory, sales, POS. Paid: explicit signed entitlements for 1/3/6/12 calendar months, validated in Main per protected request. Existing Hub uses an independent activation contract; desktop DFL1 is product-separated and neither changes nor accepts Hub licenses. See [the implemented contract, threat model and transfer policy](LICENSING.md) and [administrator operations](admin/README.md).

Device identity combines hashes of two usable Windows machine identifiers (MachineGuid and SMBIOS UUID preferred, BIOS fallback). No MAC, disk or host-name input. The source selection and hashed identity are cached in protected storage for temporary probe failures; successful identity changes require an exact matching administrator-issued replacement. There is no random installation ID that silently breaks subscriptions on a clean app reinstall under the same Windows identity. Windows reinstall or motherboard replacement may require transfer. Raw hardware identifiers are never persisted or sent.

An independent administrator tool keeps the Ed25519 private key in an external DPAPI CurrentUser vault. Client dist contains verification public keys only. The versioned signature binds license ID, device ID, customer, dates, duration, feature list and previous-license reference for transfers. Canonical bytes, input bounds and strict schema prevent modified licenses from being accepted. Test keys are ephemeral; tests rebuild a separate temporary artifact rather than adding a production trust override.

Time: protected last-seen high-water plus monotonic elapsed session time; five-minute rollback tolerance, sticky review above that tolerance, five-day warning/countdown. Paid access locks at exact expiry; free remains, and no business data or saved license is deleted. Checkpoints persist every 30 seconds and on sensitive operations. A future service can supply signed timestamps/revocations. Offline cloning, total state deletion/snapshot restoration, same-user malware and binary patching remain limitations.

Security later: baseline protection for every edition, DPAPI-managed encryption keys, vetted database encryption, optional advanced key management, signed installers and updates, integrity checks, fuses and suitable obfuscation. Obfuscated JavaScript is not a security boundary. No installer or license implementation in tasks 01–10.

References: https://www.electronjs.org/docs/latest/tutorial/security and https://vite.dev/guide/ (reviewed 2026-10-31).
