const { test } = require("node:test"),
  assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
test("client distribution contains public roots only, no administrator signer or private keys", () => {
  const keys = JSON.parse(
    fs.readFileSync(
      path.join(root, "src/main/licensing/public-keys.json"),
      "utf8",
    ),
  );
  assert.ok(Object.keys(keys).length > 0);
  for (const pem of Object.values(keys))
    assert.equal(crypto.createPublicKey(pem).asymmetricKeyType, "ed25519");
  const files = [];
  function scan(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) scan(f);
      else files.push(f);
    }
  }
  scan(path.join(root, "dist"));
  for (const file of files) {
    assert.doesNotMatch(path.basename(file), /admin|private|ledger|\.dpapi$/i);
    if (/\.(cjs|js|json|html)$/.test(file)) {
      const text = fs.readFileSync(file, "utf8");
      assert.doesNotMatch(
        text,
        /BEGIN (?:ENCRYPTED )?PRIVATE KEY|generateKeyPairSync|createPrivateKey|signing-private\.dpapi/,
      );
    }
  }
});
