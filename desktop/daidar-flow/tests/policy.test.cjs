const { test } = require("node:test");
const assert = require("node:assert/strict");
const { features, featureAccess } = require("../dist/policy.cjs");
test("exactly three free tools and five protected upgrade tools", () => {
  assert.equal(features.length, 8);
  assert.equal(features.filter((f) => f.tier === "free").length, 3);
  assert.equal(new Set(features.map((f) => f.id)).size, 8);
  for (const f of features)
    assert.equal(
      featureAccess(f.id).status,
      f.tier === "free" ? "coming-soon" : "locked",
    );
});
test("untrusted and malformed feature requests fail closed", () => {
  for (const value of [
    null,
    undefined,
    {},
    [],
    { id: "analytics", paid: true },
    "../analytics",
    "__proto__",
    "constructor",
    "unknown",
  ])
    assert.equal(featureAccess(value).status, "invalid");
});

const { approvedBrandUrl } = require("../dist/brand-policy.cjs");
test("only the verified company link IDs resolve to external URLs", () => {
  assert.equal(approvedBrandUrl("website"), "https://daidarsoluations.com/");
  assert.equal(
    approvedBrandUrl("facebook"),
    "https://www.facebook.com/daidarsoluations/",
  );
  for (const input of [
    "https://evil.example",
    "file:///C:/Windows",
    "javascript:alert(1)",
    "__proto__",
    "constructor",
    {},
    null,
  ])
    assert.equal(approvedBrandUrl(input), null);
});
