const assert = require("node:assert/strict");
const { withApp, expect } = require("./helpers.cjs");
withApp(async (app, page) => {
  const errors = [],
    remote = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) remote.push(request.url());
  });
  await page.context().setOffline(true);
  await page.reload();
  await page.getByRole("heading", { name: "أهلًا بك في دعيدر فلو" }).waitFor();
  assert.equal(await page.locator(".feature-card").count(), 8);
  assert.equal(await page.evaluate(() => document.documentElement.dir), "rtl");
  assert.equal(await page.evaluate(() => typeof window.require), "undefined");
  assert.equal(
    await page.evaluate(() => typeof window.daidar.invoke),
    "undefined",
  );
  const info = await page.evaluate(() => window.daidar.getAppInfo());
  for (const feature of info.features) {
    const result = await page.evaluate(
      (id) => window.daidar.openFeature(id),
      feature.id,
    );
    assert.equal(
      result.status,
      feature.tier === "free" ? "coming-soon" : "locked",
    );
    await page.locator('[data-feature="' + feature.id + '"] button').click();
    await page.getByRole("status").filter({ hasText: feature.title }).waitFor();
    await page
      .getByRole("button", { name: "إغلاق الرسالة", exact: true })
      .click();
  }
  assert.equal(
    (
      await page.evaluate(() =>
        window.daidar.openFeature({ id: "inventory", paid: true }),
      )
    ).status,
    "invalid",
  );
  assert.equal(new URL(page.url()).pathname, "/index.html");
  await page.evaluate(() => {
    const script = document.createElement("script");
    script.textContent = "window.__injected=true";
    document.head.append(script);
  });
  assert.equal(await page.evaluate(() => window.__injected), undefined);
  const traversal = await app.evaluate(
    async ({ net }) =>
      (await net.fetch("daidar://app/%2e%2e%5cmain.cjs")).status,
  );
  assert.equal(traversal, 403);
  await page.evaluate(() => window.open("https://evil.example"));
  assert.equal(
    await app.evaluate(
      ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
    ),
    1,
  );
  assert.deepEqual(remote, []);
  assert.deepEqual(errors, []);
  await app.evaluate(({ ipcMain }, info) => {
    let calls = 0;
    ipcMain.removeHandler("app:info");
    ipcMain.handle("app:info", () => {
      if (calls++ === 0) throw Error("Simulated initialization failure");
      return info;
    });
  }, info);
  await page.reload();
  await page
    .getByRole("button", { name: "إعادة المحاولة", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "إعادة المحاولة", exact: true })
    .click();
  await page.getByRole("heading", { name: "أهلًا بك في دعيدر فلو" }).waitFor();
  assert.equal(await page.locator(".feature-card").count(), 8);
  console.log(
    "PASS: offline dashboard, all 8 actions, IPC validation, CSP, path traversal denial, popup denial, no remote requests or JS errors, initialization recovery",
  );
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
