const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { LicenseService } = require("../dist/license-service.cjs"),
  { setup } = require("./license-service.test.cjs");
test("five-day boundary, exact expiry, free remains and saved license is never deleted", async () => {
  const f = setup();
  f.wall = Date.parse("2026-10-27T00:00:00.000Z") - 1;
  const s = new LicenseService(f.deps);
  await s.initialize();
  await s.activate(f.code());
  assert.equal((await s.status()).status, "active");
  f.wall = Date.parse("2026-10-27T00:00:00.000Z");
  assert.equal((await s.status()).status, "expiring");
  const code = f.stored.code;
  f.wall = Date.parse("2026-11-01T00:00:00.000Z");
  assert.equal((await s.openFeature("analytics")).status, "locked");
  assert.equal((await s.status()).status, "expired");
  assert.equal((await s.openFeature("sales")).status, "coming-soon");
  assert.equal(f.stored.code, code);
});
test("clock rollback sticky over restart/import; monotonic floor and recovery", async () => {
  const f = setup(),
    s = new LicenseService(f.deps);
  await s.initialize();
  await s.activate(f.code());
  f.wall = Date.parse("2026-10-30T10:00:00.000Z");
  f.mono = 1000;
  assert.equal((await s.status()).status, "clock-review");
  assert.equal((await s.openFeature("analytics")).status, "locked");
  assert.equal((await s.activate(f.code())).ok, false);
  const restart = new LicenseService(f.deps);
  await restart.initialize();
  assert.equal((await restart.status()).status, "clock-review");
  assert.equal((await restart.openFeature("pos")).status, "coming-soon");
  f.wall = Date.parse("2026-10-31T10:01:00.000Z");
  assert.equal((await restart.status()).status, "expiring");
});
test("small rollback cannot extend the expiry; monotonic time and forward jumps", async () => {
  const f = setup();
  f.wall = Date.parse("2026-10-31T23:59:00.000Z");
  const s = new LicenseService(f.deps);
  await s.initialize();
  await s.activate(f.code());
  f.wall = Date.parse("2026-10-31T23:58:00.000Z");
  f.mono = 60001;
  assert.equal((await s.status()).status, "expired");
  assert.equal((await s.openFeature("analytics")).status, "locked");
  f.wall = Date.parse("2027-01-01T00:00:00.000Z");
  await s.openFeature("analytics");
  f.wall = Date.parse("2026-10-31T23:59:00.000Z");
  assert.equal((await s.status()).status, "clock-review");
});
test("future subscriptions stay locked until start and operate at start", async () => {
  const f = setup(),
    s = new LicenseService(f.deps);
  await s.initialize();
  const startsAt = "2026-11-01T00:00:00.000Z";
  assert.equal(
    (
      await s.activate(
        f.code({ startsAt, expiresAt: "2026-12-01T00:00:00.000Z" }),
      )
    ).ok,
    true,
  );
  assert.equal((await s.status()).status, "not-started");
  assert.equal((await s.openFeature("analytics")).status, "locked");
  f.wall = Date.parse(startsAt);
  assert.equal((await s.status()).status, "active");
});
