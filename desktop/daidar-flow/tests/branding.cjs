const assert = require("node:assert/strict");
const { withApp, expect } = require("./helpers.cjs");
withApp(async (app, page) => {
  await app.evaluate(({ shell }) => {
    globalThis.__opened = [];
    shell.openExternal = async (url) => {
      globalThis.__opened.push(url);
    };
  });
  await page.getByRole("link", { name: "Website", exact: true }).click();
  await expect
    .poll(() => app.evaluate(() => globalThis.__opened.length))
    .toBe(1);
  await page.getByRole("link", { name: "Facebook", exact: true }).click();
  await expect
    .poll(() => app.evaluate(() => globalThis.__opened.length))
    .toBe(2);
  assert.deepEqual(await app.evaluate(() => globalThis.__opened), [
    "https://daidarsoluations.com/",
    "https://www.facebook.com/daidarsoluations/",
  ]);
  assert.equal(
    await page.evaluate(() =>
      window.daidar.openBrandLink("file:///C:/Windows"),
    ),
    false,
  );
  assert.equal(
    await page.evaluate(() =>
      window.daidar.openBrandLink("https://evil.example"),
    ),
    false,
  );
  assert.equal(new URL(page.url()).protocol, "daidar:");
  console.log(
    "PASS: verified brand links route to external browser handler; arbitrary links denied",
  );
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
