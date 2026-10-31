const assert = require("node:assert/strict");
const { withApp } = require("./helpers.cjs");
withApp(async (app, page) => {
  await page
    .getByRole("button", { name: "فتح — المخزون", exact: true })
    .click();
  await page.getByRole("heading", { name: "المخزون", exact: true }).waitFor();
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
  await page
    .getByRole("button", { name: "العودة للأدوات", exact: true })
    .click();
  await page.getByRole("heading", { name: "أهلًا بك في دعيدر فلو" }).waitFor();
  console.log(
    "PASS: inventory navigation, empty real SQLite database and return to unchanged dashboard",
  );
}).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
