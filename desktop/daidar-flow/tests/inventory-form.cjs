const assert = require("node:assert/strict"),
  { withApp, expect } = require("./helpers.cjs");
withApp(async (app, page) => {
  await page
    .getByRole("button", { name: "فتح — المخزون", exact: true })
    .click();
  await page.getByRole("button", { name: "إضافة منتج", exact: true }).click();
  await expect(page.locator("#product-name")).toBeFocused();
  assert.equal(await page.locator("#product-unit").inputValue(), "قطعة");
  assert.equal(await page.getByRole("dialog").count(), 0);
  await page.locator("#product-name").fill("منتج اختبار نموذج");
  await page.getByRole("button", { name: "إلغاء", exact: true }).click();
  await expect(page.locator(".product-collapse")).not.toHaveClass(/open/);
  await page.getByRole("button", { name: "إضافة منتج", exact: true }).click();
  await expect(page.locator("#product-name")).toHaveValue("");
  await page.getByRole("button", { name: "إضافة منتج", exact: true }).click();
  await expect(page.locator(".product-collapse")).not.toHaveClass(/open/);
  console.log(
    "PASS: inline collapsible product form, focus, piece default, cancel/toggle and fresh draft, no modal",
  );
}).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
