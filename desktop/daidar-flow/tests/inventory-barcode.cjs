const assert = require("node:assert/strict"),
  { withApp, expect } = require("./helpers.cjs");
withApp(async (app, page) => {
  const base = {
    name: "منتج باركود",
    sellingPrice: "1.05",
    quantity: "0",
    unit: "قطعة",
    barcode: "00012345",
  };
  assert.equal(
    (await page.evaluate((v) => window.daidar.inventory.create(v), base)).ok,
    true,
  );
  await page
    .getByRole("button", { name: "فتح — المخزون", exact: true })
    .click();
  await page.getByRole("button", { name: "إضافة منتج", exact: true }).click();
  await page.locator("#product-name").fill("منتج جديد");
  await page.locator("#product-price").fill("2.10");
  await page.locator("#product-barcode").pressSequentially("00012345");
  await page.locator("#product-barcode").press("Enter");
  await page.locator("#product-barcode").press("Enter");
  assert.equal(
    (
      await page.evaluate(() =>
        window.daidar.inventory.list({ search: "", page: 1 }),
      )
    ).data.total,
    1,
  );
  await expect(page.locator(".product-collapse")).toHaveClass(/open/);
  await page.getByRole("button", { name: "حفظ المنتج", exact: true }).click();
  await expect(page.locator(".product-form-error")).toContainText(
    "مسجل لمنتج آخر",
  );
  await expect(page.locator("#product-name")).toHaveValue("منتج جديد");
  await expect(page.locator("#product-barcode")).toHaveValue("00012345");
  await page.locator("#product-barcode").fill("0000000002");
  await page.getByRole("button", { name: "حفظ المنتج", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(2);
  const result = await page.evaluate(() =>
    window.daidar.inventory.list({ search: "0000000002", page: 1 }),
  );
  assert.equal(result.data.items[0].barcode, "0000000002");
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await page.evaluate((v) => window.daidar.inventory.create(v), {
          ...base,
          name: "بدون باركود",
          barcode: "",
        })
      ).ok,
      true,
    );
  console.log(
    "PASS: HID keyboard scan + Enter does not submit; duplicate rejected with draft retained; zero prefixes and multiple nullable barcodes stored as text",
  );
}).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
