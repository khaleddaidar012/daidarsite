const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const p = require("../dist/license-protocol.cjs");
function fixture(overrides = {}) {
  const pair = crypto.generateKeyPairSync("ed25519");
  const pub = pair.publicKey.export({ type: "spki", format: "pem" });
  const license = {
    v: 1,
    product: "daidar-flow-desktop",
    keyId: p.keyId(pub),
    licenseId: crypto.randomUUID(),
    customer: "Test only",
    deviceId: "DFD1-" + "A".repeat(64),
    issuedAt: "2026-01-01T00:00:00.000Z",
    startsAt: "2026-01-31T12:00:00.000Z",
    expiresAt: "2026-02-28T12:00:00.000Z",
    months: 1,
    features: ["analytics"],
    replaces: null,
    ...overrides,
  };
  const bytes = Buffer.from(p.canonical(license));
  const code =
    "DFL1." +
    bytes.toString("base64url") +
    "." +
    crypto.sign(null, bytes, pair.privateKey).toString("base64url");
  return { license, code, keys: { [license.keyId]: pub }, pair };
}
test("all calendar durations clamp month ends", () => {
  for (const m of [1, 3, 6, 12])
    assert.ok(p.addMonths("2024-01-31T00:00:00.000Z", m));
  assert.equal(
    p.addMonths("2024-01-31T00:00:00.000Z", 1),
    "2024-02-29T00:00:00.000Z",
  );
  assert.equal(
    p.addMonths("2024-02-29T00:00:00.000Z", 12),
    "2025-02-28T00:00:00.000Z",
  );
  assert.throws(() => p.addMonths("2024-01-01", 2));
});
test("Ed25519 envelope verifies and any changed data/signature or unknown key fails", () => {
  const f = fixture();
  assert.deepEqual(p.verifyLicense(f.code, f.keys), f.license);
  assert.throws(() => p.verifyLicense(f.code, {}));
  const parts = f.code.split(".");
  parts[1] = Buffer.from(
    p.canonical({ ...f.license, deviceId: "DFD1-" + "B".repeat(64) }),
  ).toString("base64url");
  assert.throws(() => p.verifyLicense(parts.join("."), f.keys));
  parts[1] = f.code.split(".")[1];
  parts[2] = Buffer.alloc(64).toString("base64url");
  assert.throws(() => p.verifyLicense(parts.join("."), f.keys));
});
test("strict signed schema, bounded import, product separation and encoding", () => {
  for (const overrides of [
    { product: "hub" },
    { months: 2 },
    { features: ["unknown"] },
    { features: ["analytics", "analytics"] },
    { expiresAt: "2026-02-30T12:00:00.000Z" },
  ]) {
    const f = fixture(overrides);
    assert.throws(() => p.verifyLicense(f.code, f.keys));
  }
  for (const value of [null, {}, "x".repeat(17000), "DFL1.===.==="])
    assert.throws(() => p.verifyLicense(value, {}));
  const f = fixture();
  for (const text of [
    JSON.stringify({ ...f.license, admin: true }),
    JSON.stringify(f.license, null, 2),
    p.canonical(f.license).replace("{", '{"v":1,'),
  ]) {
    const bytes = Buffer.from(text),
      code =
        "DFL1." +
        bytes.toString("base64url") +
        "." +
        crypto.sign(null, bytes, f.pair.privateKey).toString("base64url");
    assert.throws(() => p.verifyLicense(code, f.keys));
  }
});
module.exports = { fixture };
