const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { LicenseService } = require("../dist/license-service.cjs");
const p = require("../dist/license-protocol.cjs"),
  { deriveDevice } = require("../dist/device.cjs");
const raw = { machineGuid: "test-machine-guid", uuid: "test-smbios-uuid" };
const device = deriveDevice(raw);
function setup() {
  const pair = crypto.generateKeyPairSync("ed25519"),
    pub = pair.publicKey.export({ type: "spki", format: "pem" }),
    keys = { [p.keyId(pub)]: pub };
  let stored = null,
    wall = Date.parse("2026-10-31T10:00:00.000Z"),
    mono = 0,
    writes = 0,
    fail = false;
  const deps = {
    keys,
    now: () => wall,
    monotonic: () => mono,
    readDevice: async () => raw,
    store: {
      read: async () => stored,
      write: async (s) => {
        if (fail) throw Error("disk");
        stored = structuredClone(s);
        writes++;
      },
    },
  };
  function code(overrides = {}) {
    const payload = {
      v: 1,
      product: "daidar-flow-desktop",
      keyId: p.keyId(pub),
      licenseId: crypto.randomUUID(),
      customer: "Test",
      deviceId: device.id,
      issuedAt: "2026-10-01T00:00:00.000Z",
      startsAt: "2026-10-01T00:00:00.000Z",
      expiresAt: "2026-11-01T00:00:00.000Z",
      months: 1,
      features: ["analytics"],
      replaces: null,
      ...overrides,
    };
    const b = Buffer.from(p.canonical(payload));
    return (
      "DFL1." +
      b.toString("base64url") +
      "." +
      crypto.sign(null, b, pair.privateKey).toString("base64url")
    );
  }
  return {
    deps,
    code,
    get stored() {
      return stored;
    },
    set stored(v) {
      stored = v;
    },
    set wall(v) {
      wall = v;
    },
    set mono(v) {
      mono = v;
    },
    set fail(v) {
      fail = v;
    },
    get writes() {
      return writes;
    },
  };
}
test("activation is bound to device and entitlements; failed imports preserve active code; restart", async () => {
  const f = setup(),
    s = new LicenseService(f.deps);
  await s.initialize();
  assert.equal((await s.status()).status, "free");
  assert.equal(
    (await s.activate(f.code({ deviceId: "DFD1-" + "F".repeat(64) }))).ok,
    false,
  );
  assert.equal((await s.activate(f.code())).ok, true);
  assert.equal((await s.openFeature("analytics")).status, "coming-soon");
  assert.equal((await s.openFeature("employees")).status, "locked");
  const before = f.stored.code;
  assert.equal((await s.activate("tamper")).ok, false);
  assert.equal(f.stored.code, before);
  const next = new LicenseService(f.deps);
  await next.initialize();
  assert.equal((await next.status()).status, "expiring");
  const other = new LicenseService({
    ...f.deps,
    readDevice: async () => ({ ...raw, uuid: "another-device-uuid" }),
  });
  await other.initialize();
  assert.equal((await other.status()).status, "device-mismatch");
  assert.equal((await other.openFeature("analytics")).status, "locked");
  assert.equal((await other.openFeature("pos")).status, "coming-soon");
});
test("unreadable/corrupt storage and failed saves fail closed; free remains", async () => {
  const f = setup();
  f.stored = { bad: true };
  const s = new LicenseService(f.deps);
  await s.initialize();
  assert.equal((await s.status()).status, "storage-error");
  assert.equal((await s.openFeature("inventory")).status, "coming-soon");
  assert.equal((await s.activate(f.code())).ok, false);
  const g = setup(),
    s2 = new LicenseService(g.deps);
  await s2.initialize();
  g.fail = true;
  assert.equal((await s2.activate(g.code())).ok, false);
  assert.equal((await s2.openFeature("analytics")).status, "locked");
});
module.exports = { setup };
