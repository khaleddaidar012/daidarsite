const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const { spawnSync } = require("node:child_process");
const assert = require("node:assert/strict");
const { _electron: electron } = require("playwright"),
  { expect } = require("playwright/test");
const { verifyLicense } = require("../dist/license-protocol.cjs");
(async () => {
  const root = path.resolve(__dirname, ".."),
    temp = fs.mkdtempSync(path.join(os.tmpdir(), "daidar-admin-ui-test-"));
  const vault = path.join(temp, "vault"),
    pubFile = path.join(temp, "public.json");
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, "admin-dist/license-admin.cjs"),
      "init",
      "--vault",
      vault,
      "--public-out",
      pubFile,
    ],
    { encoding: "utf8", windowsHide: true },
  );
  assert.equal(result.status, 0, result.stderr);
  const keys = JSON.parse(fs.readFileSync(pubFile, "utf8"));
  await require("esbuild").build({
    absWorkingDir: root,
    entryPoints: ["admin/ui/main.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: path.join(temp, "main.cjs"),
    external: ["electron"],
    plugins: [
      {
        name: "ephemeral-admin-ui-root",
        setup(build) {
          build.onLoad({ filter: /public-keys\.json$/ }, () => ({
            contents: JSON.stringify(keys),
            loader: "json",
          }));
        },
      },
    ],
  });
  fs.copyFileSync(
    path.join(root, "admin-dist/gui/preload.cjs"),
    path.join(temp, "preload.cjs"),
  );
  fs.cpSync(
    path.join(root, "admin-dist/gui/renderer"),
    path.join(temp, "renderer"),
    { recursive: true },
  );
  const env = { ...process.env, DAIDAR_FLOW_TEST: "1" };
  delete env.ELECTRON_RUN_AS_NODE;
  let app;
  try {
    app = await electron.launch({
      args: [
        path.join(temp, "main.cjs"),
        "--user-data-dir=" + path.join(temp, "profile"),
      ],
      env,
      timeout: 30000,
    });
    const page = await app.firstWindow();
    await page
      .getByRole("heading", { name: "إصدار كود تفعيل", exact: true })
      .waitFor();
    const prefs = await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences(),
    );
    assert.equal(prefs.sandbox, true);
    assert.equal(prefs.contextIsolation, true);
    assert.equal(prefs.nodeIntegration, false);
    assert.equal(await page.evaluate(() => typeof window.require), "undefined");
    assert.equal(
      await page.evaluate(() => typeof window.licenseAdmin.invoke),
      "undefined",
    );
    await app.evaluate(({ dialog }, vault) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [vault],
      });
    }, vault);
    await page
      .getByRole("button", { name: "اختيار الخزنة", exact: true })
      .click();
    await expect(page.locator(".vault")).toHaveClass(/ready/);
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setContentSize(1220, 1050),
    );
    fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });
    await page.screenshot({
      path: path.join(root, "artifacts/admin-ui-empty.png"),
    });
    const issue = page.getByRole("button", {
      name: "إصدار كود التفعيل",
      exact: true,
    });
    await expect(issue).toBeDisabled();
    await page.locator("#device").fill("invalid");
    await expect(issue).toBeDisabled();
    await page.locator("#device").fill("DFD1-" + "A".repeat(64));
    await page.getByRole("radio", { name: "3 أشهر", exact: true }).check();
    await expect(issue).toBeEnabled();
    assert.equal(await page.locator("#customer").inputValue(), "");
    await issue.click();
    await expect(page.getByRole("status")).toContainText("تم إصدار الترخيص");
    const code = await page.locator("#result-code").inputValue(),
      license = verifyLicense(code, keys);
    assert.equal(license.months, 3);
    assert.equal(license.customer, "عميل بدون اسم");
    assert.equal(license.deviceId, "DFD1-" + "A".repeat(64));
    const oldClipboard = await app.evaluate(({ clipboard }) =>
      clipboard.readText(),
    );
    try {
      await page
        .getByRole("button", { name: "نسخ الكود", exact: true })
        .click();
      assert.equal(
        await app.evaluate(({ clipboard }) => clipboard.readText()),
        code,
      );
    } finally {
      await app.evaluate(
        ({ clipboard }, text) => clipboard.writeText(text),
        oldClipboard,
      );
    }
    const out = path.join(temp, "customer.dfl");
    await app.evaluate(({ dialog }, file) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: file });
    }, out);
    await page
      .getByRole("button", { name: "حفظ ملف الترخيص", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("تم حفظ ملف الترخيص");
    assert.equal(fs.readFileSync(out, "utf8").trim(), code);
    await page.screenshot({
      path: path.join(root, "artifacts/admin-ui-issued.png"),
    });
    await page
      .getByRole("button", { name: "نقل لجهاز آخر", exact: true })
      .click();
    await page.locator("#device").fill("DFD1-" + "B".repeat(64));
    const transfer = page.getByRole("button", {
      name: "إصدار الترخيص البديل",
      exact: true,
    });
    await expect(transfer).toBeDisabled();
    await page.locator("#reason").fill("استبدال جهاز العميل");
    await page
      .getByRole("checkbox", {
        name: "راجعت طلب العميل وطلبت إيقاف استخدام الجهاز القديم.",
      })
      .check();
    await transfer.click();
    await expect(page.getByRole("status")).toContainText("تم نقل الترخيص");
    const replacement = verifyLicense(
      await page.locator("#result-code").inputValue(),
      keys,
    );
    assert.equal(replacement.expiresAt, license.expiresAt);
    assert.equal(replacement.replaces, license.licenseId);
    assert.equal(replacement.deviceId, "DFD1-" + "B".repeat(64));
    assert.equal(
      (
        await page.evaluate(() =>
          window.licenseAdmin.issue({
            customer: "",
            deviceId: "bad",
            months: 2,
            features: [],
          }),
        )
      ).ok,
      false,
    );
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "إصدار كود تفعيل", exact: true }),
    ).toBeVisible();
    // A reload does not issue anything; explicitly choose the existing test vault again.
    await page
      .getByRole("button", { name: "اختيار الخزنة", exact: true })
      .click();
    await expect(page.locator(".history-list article")).toHaveCount(2);
    await page
      .getByRole("button", { name: "عرض الكود", exact: true })
      .first()
      .click();
    assert.equal(
      verifyLicense(await page.locator("#result-code").inputValue(), keys)
        .licenseId,
      replacement.licenseId,
    );
    for (const width of [768, 390]) {
      await app.evaluate(
        ({ BrowserWindow }, width) =>
          BrowserWindow.getAllWindows()[0].setContentSize(width, 900),
        width,
      );
      await expect.poll(() => page.evaluate(() => innerWidth)).toBe(width);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
    }
    await page.screenshot({
      path: path.join(root, "artifacts/admin-ui-narrow.png"),
    });
    assert.equal(
      fs
        .readFileSync(path.join(vault, "ledger.json"), "utf8")
        .includes("PRIVATE KEY"),
      false,
    );
    console.log(
      "PASS: admin UI issues without customer name, optional durations, real DPAPI signing, copy/export, history, device transfer, validation, responsive layout and isolated renderer",
    );
  } finally {
    if (app) await app.close();
    if (
      path.dirname(path.resolve(temp)) === path.resolve(os.tmpdir()) &&
      path.basename(temp).startsWith("daidar-admin-ui-test-")
    )
      fs.rmSync(temp, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
