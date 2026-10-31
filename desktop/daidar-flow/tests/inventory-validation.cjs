const assert = require("node:assert/strict"),
  { withApp, expect } = require("./helpers.cjs");
withApp(async (app, page) => {
  const base = {
    name: "منتج اختبار",
    sellingPrice: "5.10",
    quantity: "1",
    barcode: "0007",
    unit: "قطعة",
  };
  for (const change of [
    { sellingPrice: "-5" },
    { quantity: "-1" },
    { quantity: "0.5" },
    { name: "" },
  ])
    assert.equal(
      (
        await page.evaluate((v) => window.daidar.inventory.create(v), {
          ...base,
          ...change,
        })
      ).ok,
      false,
    );
  const [a, b] = await page.evaluate(
    async (v) =>
      Promise.all([
        window.daidar.inventory.create(v),
        window.daidar.inventory.create(v),
      ]),
    base,
  );
  assert.equal([a, b].filter((x) => x.ok).length, 1);
  await page
    .getByRole("button", { name: "فتح — المخزون", exact: true })
    .click();
  await page.getByRole("button", { name: "إضافة منتج", exact: true }).click();
  await page.locator("#product-name").fill("اسم محفوظ عند الخطأ");
  await page.locator("#product-price").fill("-1");
  await page.getByRole("button", { name: "حفظ المنتج", exact: true }).click();
  await expect(page.locator(".product-form-error")).toContainText("غير سالب");
  await expect(page.locator("#product-name")).toHaveValue(
    "اسم محفوظ عند الخطأ",
  );
  await page.locator("#product-price").fill("2");
  await page.locator("#product-quantity").fill("-2");
  await page.getByRole("button", { name: "حفظ المنتج", exact: true }).click();
  await expect(page.locator(".product-form-error")).toContainText("غير سالب");
  await page.locator("#product-quantity").fill("1.125");
  await page.locator("#product-unit").selectOption("كيلوجرام");
  await page.getByRole("button", { name: "حفظ المنتج", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.getByRole("button", { name: "إضافة منتج", exact: true }).click();
  await page.locator("#product-name").fill("بيانات عند فشل الحفظ");
  await page.locator("#product-price").fill("7.25");
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler("inventory:create");
    ipcMain.handle("inventory:create", () => {
      throw Error("simulated internal disk error");
    });
  });
  await page.getByRole("button", { name: "حفظ المنتج", exact: true }).click();
  await expect(page.locator(".product-form-error")).toContainText(
    "تعذر حفظ المنتج",
  );
  await expect(page.locator("#product-name")).toHaveValue(
    "بيانات عند فشل الحفظ",
  );
  assert.equal(
    (await page.locator(".product-form-error").textContent()).includes(
      "internal disk",
    ),
    false,
  );
  assert.equal(
    await page.evaluate(() => typeof window.daidar.inventory.exec),
    "undefined",
  );
  console.log(
    "PASS: negative/fractional validation, concurrent duplicate guard, weight quantities, draft retained on validation/IPC error, no SQL API or internal details exposed",
  );
}).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
