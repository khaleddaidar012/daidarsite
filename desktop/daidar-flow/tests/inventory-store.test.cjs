const { test } = require("node:test"),
  assert = require("node:assert/strict");
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const {
  ProductsStore,
  inventoryResult,
} = require("../dist/inventory-store.cjs");
const draft = (extra = {}) => ({
  name: "بسكوت سادة",
  sellingPrice: "12.35",
  quantity: "10",
  barcode: "0012345678901",
  unit: "قطعة",
  ...extra,
});
test("data-layer validation, exact decimal scales, defaults, conflicts and soft delete reservations", () => {
  const db = new ProductsStore(":memory:");
  try {
    for (const change of [
      { name: "" },
      { name: " " },
      { name: "x".repeat(161) },
      { name: "bad\0name" },
      { sellingPrice: "-1" },
      { sellingPrice: "1.001" },
      { sellingPrice: "1e2" },
      { sellingPrice: 1 },
      { quantity: "-1" },
      { quantity: "1.0001" },
      { quantity: "1.5" },
      { quantity: "Infinity" },
      { barcode: "00 12" },
      { unit: "unknown" },
    ])
      assert.equal(
        inventoryResult(() => db.create(draft(change))).ok,
        false,
        JSON.stringify(change),
      );
    const weighted = db.create(
      draft({ sellingPrice: "١٢٫٣٥", quantity: "٢٫١٢٥", unit: "كيلوجرام" }),
    );
    assert.equal(weighted.selling_price, 1235);
    assert.equal(weighted.quantity, 2125);
    const zero = db.create(
      draft({ sellingPrice: "0", quantity: "0", barcode: "", unit: undefined }),
    );
    assert.equal(zero.unit, "قطعة");
    assert.equal(zero.selling_price, 0);
    assert.equal(zero.quantity, 0);
    const next = db.update({
      id: weighted.id,
      revision: weighted.revision,
      draft: draft({ sellingPrice: "0.10", quantity: "0.001", unit: "لتر" }),
    });
    assert.equal(next.selling_price, 10);
    assert.equal(next.quantity, 1);
    assert.equal(next.revision, 2);
    assert.equal(
      inventoryResult(() =>
        db.update({ id: weighted.id, revision: 1, draft: draft() }),
      ).ok,
      false,
    );
    assert.equal(
      inventoryResult(() => db.remove({ id: weighted.id, revision: 1 })).ok,
      false,
    );
    db.remove({ id: next.id, revision: next.revision });
    assert.equal(db.list({ search: "001234", page: 1 }).matched, 0);
    assert.equal(inventoryResult(() => db.create(draft())).ok, false);
    assert.equal(
      inventoryResult(() => db.list({ search: "", page: 0 })).ok,
      false,
    );
    assert.equal(
      inventoryResult(() =>
        db.remove({ id: "x'; DROP TABLE products;--", revision: 1 }),
      ).ok,
      false,
    );
  } finally {
    db.close();
  }
});
test("partial search and bounded SQL pagination with ten thousand products", () => {
  const db = new ProductsStore(":memory:");
  try {
    for (let i = 0; i < 10000; i++)
      db.create(
        draft({
          name: i === 8765 ? "منتج فريد للاختبار" : "منتج " + i,
          barcode: "00" + String(i).padStart(8, "0"),
        }),
      );
    const start = performance.now();
    const found = db.list({ search: "فريد", page: 1 });
    const elapsed = performance.now() - start;
    assert.equal(found.matched, 1);
    assert.equal(found.items[0].barcode, "0000008765");
    assert.equal(db.list({ search: "0000008765", page: 1 }).matched, 1);
    assert.equal(db.list({ search: "", page: 2 }).items.length, 30);
    assert.equal(db.list({ search: "", page: 99999 }).page, 334);
    assert.equal(db.list({ search: "%' OR 1=1 --", page: 1 }).matched, 0);
    assert.equal(db.list({ search: "%", page: 1 }).matched, 0);
    assert.ok(
      elapsed < 1500,
      "search should remain bounded and fast on 10k products",
    );
    console.log("10k partial-search benchmark: " + elapsed.toFixed(1) + "ms");
  } finally {
    db.close();
  }
});
test("schema, SQLite constraints, exact storage, nullable/unique text barcode and migration restart", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "daidar-inventory-db-")),
    file = path.join(temp, "inventory.sqlite");
  let db;
  try {
    db = new ProductsStore(file);
    const p = db.create(draft());
    assert.equal(p.selling_price, 1235);
    assert.equal(p.quantity, 10000);
    assert.equal(p.barcode, "0012345678901");
    assert.equal(
      db.create(draft({ barcode: "", quantity: "0", sellingPrice: "0" }))
        .barcode,
      null,
    );
    db.create(draft({ barcode: "" }));
    assert.equal(inventoryResult(() => db.create(draft())).ok, false);
    const raw = new DatabaseSync(file);
    assert.equal(
      raw.prepare("SELECT count(*) n FROM schema_migrations").get().n,
      1,
    );
    assert.throws(() =>
      raw.prepare("UPDATE products SET selling_price=-1 WHERE id=?").run(p.id),
    );
    assert.throws(() =>
      raw.prepare("UPDATE products SET quantity=123 WHERE id=?").run(p.id),
    );
    raw.close();
    db.close();
    db = new ProductsStore(file);
    assert.equal(db.list({ search: "", page: 1 }).total, 3);
    assert.equal(db.list({ search: "00123", page: 1 }).items[0].id, p.id);
  } finally {
    if (db) db.close();
    if (
      path.dirname(path.resolve(temp)) === path.resolve(os.tmpdir()) &&
      path.basename(temp).startsWith("daidar-inventory-db-")
    )
      fs.rmSync(temp, { recursive: true, force: true });
  }
});
