const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { spawnSync } = require("node:child_process");
const { verifyLicense } = require("../dist/license-protocol.cjs");
test("real DPAPI admin vault, durations, reissue audit, no overwrite or repository secrets", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "daidar-admin-test-"));
  const vault = path.join(temp, "vault"),
    publicOut = path.join(temp, "public.json");
  const tool = path.resolve(__dirname, "../admin-dist/license-admin.cjs");
  function run(command, args = [], ok = true) {
    const result = spawnSync(
      process.execPath,
      [tool, command, "--vault", vault, ...args],
      { encoding: "utf8", windowsHide: true },
    );
    if (ok) assert.equal(result.status, 0, result.stderr);
    else assert.notEqual(result.status, 0);
    return result;
  }
  try {
    run("init", ["--public-out", publicOut]);
    run("init", ["--public-out", publicOut], false);
    assert.ok(
      !fs
        .readFileSync(path.join(vault, "signing-private.dpapi"), "utf8")
        .includes("PRIVATE KEY"),
    );
    const keys = JSON.parse(fs.readFileSync(publicOut, "utf8"));
    for (const month of [1, 3, 6, 12]) {
      const out = path.join(temp, month + ".dfl");
      run("issue", [
        "--device",
        "DFD1-" + "A".repeat(64),
        "--customer",
        "Test customer",
        "--months",
        String(month),
        "--out",
        out,
      ]);
      const license = verifyLicense(fs.readFileSync(out, "utf8"), keys);
      assert.equal(license.months, month);
    }
    const anonymousFile = path.join(temp, "without-customer.dfl");
    run("issue", [
      "--device",
      "DFD1-" + "A".repeat(64),
      "--months",
      "1",
      "--out",
      anonymousFile,
    ]);
    assert.equal(
      verifyLicense(fs.readFileSync(anonymousFile, "utf8"), keys).customer,
      "عميل بدون اسم",
    );
    const previous = path.join(temp, "3.dfl"),
      out = path.join(temp, "transfer.dfl");
    const params = [
      "--previous",
      previous,
      "--device",
      "DFD1-" + "B".repeat(64),
      "--out",
      out,
      "--reason",
      "Test device replacement",
    ];
    run("reissue", params, false);
    run("reissue", [...params, "--confirm-transfer"]);
    const old = verifyLicense(fs.readFileSync(previous, "utf8"), keys),
      next = verifyLicense(fs.readFileSync(out, "utf8"), keys);
    assert.equal(next.expiresAt, old.expiresAt);
    assert.equal(next.startsAt, old.startsAt);
    assert.equal(next.replaces, old.licenseId);
    assert.notEqual(next.deviceId, old.deviceId);
    run(
      "reissue",
      [
        "--previous",
        previous,
        "--device",
        "DFD1-" + "C".repeat(64),
        "--reason",
        "Repeated transfer",
        "--out",
        path.join(temp, "again.dfl"),
        "--confirm-transfer",
      ],
      false,
    );
    const ledger = JSON.parse(
      fs.readFileSync(path.join(vault, "ledger.json"), "utf8"),
    );
    assert.equal(
      ledger.find((r) => r.id === old.licenseId).status,
      "superseded",
    );
    run("export", [
      "--license",
      next.licenseId,
      "--out",
      path.join(temp, "recovered.dfl"),
    ]);
    assert.equal(
      fs.readFileSync(path.join(temp, "recovered.dfl"), "utf8"),
      fs.readFileSync(out, "utf8"),
    );
    run(
      "export",
      [
        "--license",
        old.licenseId,
        "--out",
        path.join(temp, "revoked-export.dfl"),
      ],
      false,
    );
    run(
      "issue",
      [
        "--device",
        "DFD1-" + "A".repeat(64),
        "--customer",
        "Test",
        "--months",
        "2",
        "--out",
        path.join(temp, "invalid.dfl"),
      ],
      false,
    );
    const bad = spawnSync(
      process.execPath,
      [
        tool,
        "init",
        "--vault",
        path.resolve(__dirname, "../bad-vault"),
        "--public-out",
        path.join(temp, "bad.json"),
      ],
      { encoding: "utf8" },
    );
    assert.notEqual(bad.status, 0);
    assert.equal(fs.existsSync(path.resolve(__dirname, "../bad-vault")), false);
  } finally {
    if (
      path.dirname(path.resolve(temp)) === path.resolve(os.tmpdir()) &&
      path.basename(temp).startsWith("daidar-admin-test-")
    )
      fs.rmSync(temp, { recursive: true, force: true });
  }
});
