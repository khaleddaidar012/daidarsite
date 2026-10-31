const { test } = require("node:test");
const assert = require("node:assert/strict");
const { deriveDevice } = require("../dist/device.cjs");
const raw = {
  machineGuid: "12345678-abcd-1234-abcd-123456789012",
  uuid: "a2345678-bcde-2345-bcde-234567890123",
  bios: "SERIAL123",
};
test("stable normalized identity; network, host, disk changes have no effect", () => {
  const device = deriveDevice(raw);
  assert.equal(
    deriveDevice({
      ...raw,
      machineGuid: " " + raw.machineGuid.toUpperCase() + " ",
      mac: "other",
      disk: "new",
      hostname: "new",
    }).id,
    device.id,
  );
  assert.match(device.id, /^DFD1-[A-F0-9]{64}$/);
  assert.ok(!JSON.stringify(device).includes(raw.machineGuid));
  assert.equal(deriveDevice({}, device).id, device.id);
  assert.equal(deriveDevice({ ...raw, bios: "new" }, device).id, device.id);
  assert.notEqual(
    deriveDevice({ ...raw, uuid: "new-uuid-1234" }, device).id,
    device.id,
  );
});
test("no weak MAC-only or placeholder identity", () => {
  for (const value of [
    { mac: "ABC" },
    {
      machineGuid: "00000000-0000-0000-0000-000000000000",
      uuid: "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
    },
    { machineGuid: "valid-guid", bios: "To Be Filled By O.E.M." },
  ])
    assert.throws(() => deriveDevice(value));
});
