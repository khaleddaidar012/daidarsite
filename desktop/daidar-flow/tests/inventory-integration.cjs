const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { DatabaseSync } = require("node:sqlite"),
  { withApp, expect } = require("./helpers.cjs");
(async () => {
  const temp = fs.mkdtempSync(
      path.join(os.tmpdir(), "daidar-inventory-integration-"),
    ),
    profile = path.join(temp, "profile"),
    root = path.resolve(__dirname, "..");
  const rows = [
    ["لبن كامل الدسم 1 لتر", "32.50", "16", "قطعة", "00010001"],
    ["أرز أبيض", "28.75", "4.25", "كيلوجرام", "00010002"],
    ["بسكوت سادة", "7.50", "0", "قطعة", "00010003"],
    ["سكر أبيض", "30", "20", "كيلوجرام", "00010004"],
    ["زيت دوار الشمس", "65", "12.5", "لتر", "00010005"],
    ["مكرونة قلم", "15", "6", "قطعة", "00010006"],
  ];
  try {
    let preservedId;
    await withApp(
      async (app, page) => {
        const errors = [],
          remote = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("request", (r) => {
          if (/^https?:/.test(r.url())) remote.push(r.url());
        });
        await page.context().setOffline(true);
        await page
          .getByRole("button", { name: "فتح — المخزون", exact: true })
          .click();
        await page
          .getByRole("heading", { name: "مخزونك يبدأ بأول منتج", exact: true })
          .waitFor();
        fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });
        await page.screenshot({
          path: path.join(root, "artifacts/inventory-empty.png"),
        });
        for (const [name, sellingPrice, quantity, unit, barcode] of rows) {
          const r = await page.evaluate(
            (v) => window.daidar.inventory.create(v),
            { name, sellingPrice, quantity, unit, barcode },
          );
          assert.equal(r.ok, true);
          preservedId = r.data.id;
        }
        await page
          .getByRole("button", { name: "العودة للأدوات", exact: true })
          .click();
        await page
          .getByRole("button", { name: "فتح — المخزون", exact: true })
          .click();
        await expect(page.locator(".product-card")).toHaveCount(6);
        for (const [width, columns, suffix] of [
          [1280, 3, "desktop"],
          [768, 2, "tablet"],
          [360, 1, "narrow"],
        ]) {
          await app.evaluate(
            ({ BrowserWindow }, width) =>
              BrowserWindow.getAllWindows()[0].setContentSize(width, 950),
            width,
          );
          await expect.poll(() => page.evaluate(() => innerWidth)).toBe(width);
          assert.equal(
            await page
              .locator(".product-grid")
              .evaluate(
                (e) =>
                  getComputedStyle(e).gridTemplateColumns.split(" ").length,
              ),
            columns,
          );
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
          );
          const heights = await page
            .locator(".product-card")
            .evaluateAll((els) =>
              els.map((e) => e.getBoundingClientRect().height),
            );
          assert.ok(Math.max(...heights) - Math.min(...heights) < 2);
          await page.screenshot({
            path: path.join(root, "artifacts/inventory-" + suffix + ".png"),
          });
        }
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].setContentSize(1280, 950),
        );
        await page
          .getByRole("button", { name: "إضافة منتج", exact: true })
          .click();
        await page.locator("#product-name").fill("نموذج إضافة منتج");
        await page.locator("#product-price").fill("12.35");
        await page.locator("#product-quantity").fill("5");
        await page.screenshot({
          path: path.join(root, "artifacts/inventory-form.png"),
        });
        await page.getByRole("button", { name: "إلغاء", exact: true }).click();
        // Another webContents with the same preload and origin must not access inventory IPC.
        const childId = await app.evaluate(
          async ({ BrowserWindow }, { preload }) => {
            const child = new BrowserWindow({
              show: false,
              webPreferences: {
                preload,
                sandbox: true,
                contextIsolation: true,
                nodeIntegration: false,
              },
            });
            await child.loadURL("daidar://app/splash.html");
            return child.webContents.id;
          },
          { preload: path.join(root, "dist/preload.cjs") },
        );
        const child = app
          .windows()
          .find((p) => p.url().endsWith("/splash.html"));
        assert.ok(child);
        assert.equal(
          await child.evaluate(async () => {
            try {
              await window.daidar.inventory.list({ search: "", page: 1 });
              return false;
            } catch {
              return true;
            }
          }),
          true,
        );
        await app.evaluate(
          ({ webContents, BrowserWindow }, id) =>
            BrowserWindow.fromWebContents(webContents.fromId(id)).destroy(),
          childId,
        );
        assert.deepEqual(errors, []);
        assert.deepEqual(remote, []);
        assert.equal(
          await page.evaluate(() => typeof window.daidar.inventory.sql),
          "undefined",
        );
      },
      { profile },
    );
    await withApp(
      async (app, page) => {
        await page.context().setOffline(true);
        await page
          .getByRole("button", { name: "فتح — المخزون", exact: true })
          .click();
        await expect(page.locator(".product-card")).toHaveCount(6);
        const result = await page.evaluate(() =>
          window.daidar.inventory.list({ search: "00010006", page: 1 }),
        );
        assert.equal(result.data.items[0].id, preservedId);
        assert.equal(result.data.items[0].quantity, 6000);
        const removed = await page.evaluate(
          (v) => window.daidar.inventory.remove(v),
          {
            id: result.data.items[0].id,
            revision: result.data.items[0].revision,
          },
        );
        assert.equal(removed.ok, true);
      },
      { profile },
    );
    const check = new DatabaseSync(path.join(profile, "inventory.sqlite"));
    assert.equal(check.prepare("SELECT count(*) n FROM products").get().n, 6);
    assert.equal(
      check
        .prepare("SELECT is_active FROM products WHERE id=?")
        .get(preservedId).is_active,
      0,
    );
    check.close();
    const badProfile = path.join(temp, "bad-profile");
    fs.mkdirSync(badProfile);
    const badFile = path.join(badProfile, "inventory.sqlite");
    fs.writeFileSync(badFile, "corrupt existing database - do not replace");
    await withApp(
      async (app, page) => {
        await page
          .getByRole("button", { name: "فتح — المخزون", exact: true })
          .click();
        await expect(page.locator(".inventory-error")).toContainText(
          "تعذر إتمام عملية المخزون",
        );
        await page
          .getByRole("button", { name: "إعادة المحاولة", exact: true })
          .click();
        await expect(page.locator(".inventory-error")).toBeVisible();
        assert.equal(
          await page
            .getByRole("heading", {
              name: "مخزونك يبدأ بأول منتج",
              exact: true,
            })
            .count(),
          0,
        );
      },
      { profile: badProfile },
    );
    assert.equal(
      fs.readFileSync(badFile, "utf8"),
      "corrupt existing database - do not replace",
    );
    console.log(
      "PASS: native SQLite survives app restart, fully offline operation, soft-delete retention, 3/2/1 equal-height cards, no JS/network errors, sender isolation, and corrupt database preserved with honest retry/error UI",
    );
  } finally {
    if (
      path.dirname(path.resolve(temp)) === path.resolve(os.tmpdir()) &&
      path.basename(temp).startsWith("daidar-inventory-integration-")
    )
      fs.rmSync(temp, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
