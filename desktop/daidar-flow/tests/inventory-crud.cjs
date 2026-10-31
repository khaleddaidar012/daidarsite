const assert = require("node:assert/strict"),
  { withApp, expect } = require("./helpers.cjs");
withApp(async (app, page) => {
  await page
    .getByRole("button", { name: "فتح — المخزون", exact: true })
    .click();
  await page.getByRole("button", { name: "إضافة منتج", exact: true }).click();
  await page.locator("#product-name").fill("بسكوت سادة");
  await page.locator("#product-price").fill("12.35");
  await page.locator("#product-quantity").fill("10");
  await page.locator("#product-barcode").fill("00012345");
  await page.getByRole("button", { name: "حفظ المنتج", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-total")).toContainText("1");
  await expect(page.locator(".product-collapse")).not.toHaveClass(/open/);
  await page.getByLabel("قائمة بسكوت سادة", { exact: true }).click();
  await page.getByRole("button", { name: "تعديل المنتج", exact: true }).click();
  await expect(page.locator("#product-barcode")).toHaveValue("00012345");
  await page.locator("#product-name").fill("بسكوت معدل");
  await page
    .getByRole("button", { name: "حفظ التعديلات", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "بسكوت معدل", exact: true })
    .waitFor();
  await page.getByLabel("قائمة بسكوت معدل", { exact: true }).click();
  await page.getByRole("button", { name: "حذف المنتج", exact: true }).click();
  assert.equal(
    (
      await page.evaluate(() =>
        window.daidar.inventory.list({ search: "", page: 1 }),
      )
    ).data.total,
    1,
  );
  await page.getByRole("button", { name: "إلغاء الحذف", exact: true }).click();
  await page.getByLabel("قائمة بسكوت معدل", { exact: true }).click();
  await page.getByRole("button", { name: "حذف المنتج", exact: true }).click();
  await page.getByRole("button", { name: "تأكيد الحذف", exact: true }).click();
  await page
    .getByRole("heading", { name: "مخزونك يبدأ بأول منتج", exact: true })
    .waitFor();
  assert.equal(
    (
      await page.evaluate(() =>
        window.daidar.inventory.list({ search: "", page: 1 }),
      )
    ).data.total,
    0,
  );
  console.log(
    "PASS: native form creates/updates cards and count, edit prefill, delete confirmation and soft deletion",
  );
}).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
