const assert = require("node:assert/strict"),
  { withApp, expect } = require("./helpers.cjs");
withApp(async (app, page) => {
  for (let i = 0; i < 35; i++)
    assert.equal(
      (
        await page.evaluate(
          (i) =>
            window.daidar.inventory.create({
              name: i === 2 ? "لبن كامل الدسم" : "منتج " + i,
              sellingPrice: "7.25",
              quantity: "1",
              barcode: "000123" + String(i).padStart(3, "0"),
              unit: "قطعة",
            }),
          i,
        )
      ).ok,
      true,
    );
  await page
    .getByRole("button", { name: "فتح — المخزون", exact: true })
    .click();
  await expect(page.locator(".product-card")).toHaveCount(30);
  await page.getByRole("button", { name: "التالي", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(5);
  const search = page.getByRole("textbox", {
    name: "بحث بالاسم أو الباركود",
    exact: true,
  });
  await search.fill("لبن");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page
    .getByRole("heading", { name: "لبن كامل الدسم", exact: true })
    .waitFor();
  assert.equal(await page.locator(".product-total").textContent(), "35 منتج");
  await search.fill("000123002");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await search.fill("غير موجود");
  await page
    .getByRole("heading", { name: "لا توجد منتجات مطابقة", exact: true })
    .waitFor();
  await search.fill("");
  await expect(page.locator(".product-card")).toHaveCount(30);
  console.log(
    "PASS: live partial name/barcode search, result count, pagination and empty results without loading full catalog",
  );
}).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
