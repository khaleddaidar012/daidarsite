const assert = require("node:assert/strict");
const path = require("node:path");
const { _electron: electron } = require("playwright");
const { expect } = require("playwright/test");
(async () => {
  const env = { ...process.env, DAIDAR_FLOW_TEST: "1" };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    args: [path.resolve(__dirname, "..")],
    env,
    timeout: 30000,
  });
  try {
    await expect
      .poll(
        () => app.windows().some((page) => page.url().endsWith("/index.html")),
        { timeout: 20000 },
      )
      .toBe(true);
    const page = app
      .windows()
      .find((page) => page.url().endsWith("/index.html"));
    await page
      .getByRole("heading", { name: "أهلًا بك في دعيدر فلو" })
      .waitFor();
    await expect
      .poll(() =>
        app.evaluate(
          ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
        ),
      )
      .toBe(1);
    const state = await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      return {
        visible: window.isVisible(),
        prefs: window.webContents.getLastWebPreferences(),
      };
    });
    assert.equal(state.visible, false);
    assert.equal(state.prefs.sandbox, true);
    assert.equal(state.prefs.contextIsolation, true);
    assert.equal(state.prefs.nodeIntegration, false);
    assert.equal(await page.evaluate(() => typeof window.require), "undefined");
    assert.equal(
      await page.locator(".feature-card:not(.is-locked)").count(),
      3,
    );
    await page
      .getByRole("button", { name: "فتح — المخزون", exact: true })
      .click();
    await page.getByRole("status").filter({ hasText: "قريبًا" }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/index.html");
    assert.equal(await page.locator(".feature-card.is-locked").count(), 5);
    assert.equal(
      (await page.evaluate(() => window.daidar.openFeature("analytics")))
        .status,
      "locked",
    );
    await page.evaluate(async () => {
      localStorage.setItem("license", "paid");
      const info = await window.daidar.getAppInfo();
      info.features.forEach((f) => (f.tier = "free"));
    });
    assert.equal(
      (await page.evaluate(() => window.daidar.openFeature("cloud-backup")))
        .status,
      "locked",
    );
    await page
      .getByRole("button", {
        name: "الترقية للاستخدام — تحليل المبيعات",
        exact: true,
      })
      .click();
    await page.getByRole("status").filter({ hasText: "تتطلب ترقية" }).waitFor();
    console.log(
      "PASS: Native startup, real splash completion, hidden test window, sandbox and isolated renderer",
    );
  } finally {
    await app.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
