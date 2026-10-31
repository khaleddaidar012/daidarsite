const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { ProductsStore } = require("../dist/inventory-store.cjs"),
  { withApp, expect } = require("./helpers.cjs");
(async () => {
  const profile = fs.mkdtempSync(
    path.join(os.tmpdir(), "daidar-inventory-cards-"),
  );
  try {
    const db = new ProductsStore(path.join(profile, "inventory.sqlite"));
    for (let i = 0; i < 6; i++)
      db.create({
        name:
          i === 0
            ? "اسم منتج طويل جدًا لاختبار التفاف الكلمات بدون قص أو تداخل"
            : "منتج اختبار " + i,
        sellingPrice: "12.35",
        quantity: String(i === 0 ? 0 : i === 1 ? 2 : 20),
        unit: "قطعة",
        barcode: "00000" + i,
      });
    db.close();
    await withApp(
      async (app, page) => {
        await page
          .getByRole("button", { name: "فتح — المخزون", exact: true })
          .click();
        await expect(page.locator(".product-card")).toHaveCount(6);
        for (const [width, columns] of [
          [1280, 3],
          [768, 2],
          [360, 1],
        ]) {
          await app.evaluate(
            ({ BrowserWindow }, width) =>
              BrowserWindow.getAllWindows()[0].setContentSize(width, 900),
            width,
          );
          await expect.poll(() => page.evaluate(() => innerWidth)).toBe(width);
          assert.equal(
            await page
              .locator(".product-grid")
              .evaluate(
                (el) =>
                  getComputedStyle(el).gridTemplateColumns.split(" ").length,
              ),
            columns,
          );
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
          );
          const heights = await page
            .locator(".product-card")
            .evaluateAll((els) =>
              els.map((e) => e.getBoundingClientRect().height),
            );
          if (width === 1280) assert.ok(Math.abs(heights[0] - heights[1]) < 2);
        }
        assert.equal(
          await page.getByText("نفد المخزون", { exact: true }).count(),
          1,
        );
        assert.equal(
          await page.getByText("مخزون منخفض", { exact: true }).count(),
          1,
        );
        console.log(
          "PASS: real product cards, stock statuses, long text and 3/2/1 columns",
        );
      },
      { profile },
    );
  } finally {
    if (
      path.dirname(path.resolve(profile)) === path.resolve(os.tmpdir()) &&
      path.basename(profile).startsWith("daidar-inventory-cards-")
    )
      fs.rmSync(profile, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
