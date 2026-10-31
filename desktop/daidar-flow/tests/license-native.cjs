const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  crypto = require("node:crypto");
const { withApp, expect } = require("./helpers.cjs");
const p = require("../dist/license-protocol.cjs");
(async () => {
  const root = path.resolve(__dirname, ".."),
    temp = fs.mkdtempSync(path.join(os.tmpdir(), "daidar-license-native-"));
  const profile = path.join(temp, "profile"),
    pair = crypto.generateKeyPairSync("ed25519"),
    pub = pair.publicKey.export({ type: "spki", format: "pem" }),
    keys = { [p.keyId(pub)]: pub };
  // Rebuild production main with an ephemeral trust root in a separate test artifact only.
  // No trusted-key override or activation bypass is added to the shipped application.
  await require("esbuild").build({
    absWorkingDir: root,
    entryPoints: ["src/main/main.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: path.join(temp, "main.cjs"),
    external: ["electron"],
    plugins: [
      {
        name: "test-only-public-key",
        setup(build) {
          build.onLoad({ filter: /public-keys\.json$/ }, () => ({
            contents: JSON.stringify(keys),
            loader: "json",
          }));
        },
      },
    ],
  });
  fs.cpSync(path.join(root, "dist/renderer"), path.join(temp, "renderer"), {
    recursive: true,
  });
  fs.copyFileSync(
    path.join(root, "dist/preload.cjs"),
    path.join(temp, "preload.cjs"),
  );
  fs.writeFileSync(
    path.join(temp, "package.json"),
    JSON.stringify({
      name: "daidar-flow-license-test",
      version: "0.1.0",
      main: "main.cjs",
    }),
  );
  function code(device, extra = {}) {
    const now = new Date(),
      start = new Date(now.getTime() - 86400000).toISOString();
    const payload = {
      v: 1,
      product: "daidar-flow-desktop",
      keyId: p.keyId(pub),
      licenseId: crypto.randomUUID(),
      customer: "عميل اختبار",
      deviceId: device,
      issuedAt: start,
      startsAt: start,
      expiresAt: p.addMonths(start, 1),
      months: 1,
      features: [...p.paidFeatures],
      replaces: null,
      ...extra,
    };
    const b = Buffer.from(p.canonical(payload));
    return (
      "DFL1." +
      b.toString("base64url") +
      "." +
      crypto.sign(null, b, pair.privateKey).toString("base64url")
    );
  }
  try {
    let activated;
    await withApp(
      async (app, page) => {
        await page
          .getByRole("button", { name: "التفعيل والاشتراك", exact: true })
          .click();
        await page
          .getByRole("heading", { name: "التفعيل والاشتراك", exact: true })
          .waitFor();
        const device = await page.locator("#device-id").inputValue();
        assert.match(device, p.devicePattern);
        const oldClipboard = await app.evaluate(({ clipboard }) =>
          clipboard.readText(),
        );
        try {
          await page
            .getByRole("button", { name: "نسخ المعرف", exact: true })
            .click();
          assert.equal(
            await app.evaluate(({ clipboard }) => clipboard.readText()),
            device,
          );
        } finally {
          await app.evaluate(
            ({ clipboard }, value) => clipboard.writeText(value),
            oldClipboard,
          );
        }
        assert.equal(
          (
            await page.evaluate(
              (c) => window.daidar.activateLicense(c),
              code("DFD1-" + "F".repeat(64)),
            )
          ).ok,
          false,
        );
        await page.locator("#license-code").fill("DFL1.invalid.code");
        await page
          .getByRole("button", { name: "تفعيل الكود", exact: true })
          .click();
        await expect(page.getByRole("status")).toContainText("غير صالح");
        activated = code(device);
        await page.locator("#license-code").fill(activated);
        await page
          .getByRole("button", { name: "تفعيل الكود", exact: true })
          .click();
        await expect(page.getByRole("status")).toContainText(
          "تم التفعيل بنجاح",
        );
        assert.equal(
          (await page.evaluate(() => window.daidar.openFeature("analytics")))
            .status,
          "coming-soon",
        );
        const file = path.join(temp, "test-license.dfl");
        fs.writeFileSync(file, activated);
        await app.evaluate(({ dialog }, file) => {
          dialog.showOpenDialog = async () => ({
            canceled: false,
            filePaths: [file],
          });
        }, file);
        await page
          .getByRole("button", { name: "استيراد ملف ترخيص", exact: true })
          .click();
        await expect(page.getByRole("status")).toContainText(
          "تم التفعيل بنجاح",
        );
        fs.writeFileSync(file, "x".repeat(17000));
        await page
          .getByRole("button", { name: "استيراد ملف ترخيص", exact: true })
          .click();
        await expect(page.getByRole("status")).toContainText("أكبر من المسموح");
        assert.equal(
          (await page.evaluate(() => window.daidar.getLicense())).status,
          "active",
        );
        fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });
        await page.screenshot({
          path: path.join(root, "artifacts/activation-desktop.png"),
        });
        for (const width of [768, 360]) {
          await app.evaluate(
            ({ BrowserWindow }, w) =>
              BrowserWindow.getAllWindows()[0].setContentSize(w, 850),
            width,
          );
          await expect.poll(() => page.evaluate(() => innerWidth)).toBe(width);
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
          );
          if (width === 360)
            await page.screenshot({
              path: path.join(root, "artifacts/activation-narrow.png"),
            });
        }
        await page
          .getByRole("button", { name: "العودة للأدوات", exact: true })
          .click();
        assert.equal(await page.locator(".feature-card.is-locked").count(), 0);
        const encrypted = fs.readFileSync(
          path.join(profile, "license-state.dpapi"),
        );
        assert.ok(!encrypted.includes(Buffer.from(activated)));
      },
      { root: temp, profile },
    );
    await withApp(
      async (app, page) => {
        assert.equal(
          (await page.evaluate(() => window.daidar.getLicense())).status,
          "active",
        );
        assert.equal(
          (await page.evaluate(() => window.daidar.openFeature("analytics")))
            .status,
          "coming-soon",
        );
        const expiry = Date.parse(p.verifyLicense(activated, keys).expiresAt);
        // Simulate OS clock changes in the main process; the client has no test clock IPC.
        await app.evaluate(
          (_, time) => {
            Date.now = () => time;
          },
          expiry - 5 * 86400000,
        );
        await expect
          .poll(() =>
            page.evaluate(
              async () => (await window.daidar.getLicense()).status,
            ),
          )
          .toBe("expiring");
        await expect(page.locator(".license-alert")).toContainText("باقي");
        await app.evaluate((_, time) => {
          Date.now = () => time;
        }, expiry);
        assert.equal(
          (await page.evaluate(() => window.daidar.openFeature("analytics")))
            .status,
          "locked",
        );
        assert.equal(
          (await page.evaluate(() => window.daidar.openFeature("inventory")))
            .status,
          "coming-soon",
        );
        await expect(page.locator(".feature-card.is-locked")).toHaveCount(5);
        await expect(page.locator(".license-alert")).toContainText(
          "انتهى الاشتراك",
        );
        await app.evaluate((_, time) => {
          Date.now = () => time;
        }, Date.now());
        assert.equal(
          (await page.evaluate(() => window.daidar.getLicense())).status,
          "clock-review",
        );
        assert.equal(
          (
            await page.evaluate(
              (c) => window.daidar.activateLicense(c),
              activated,
            )
          ).ok,
          false,
        );
      },
      { root: temp, profile },
    );
    await withApp(
      async (app, page) => {
        assert.equal(
          (await page.evaluate(() => window.daidar.getLicense())).status,
          "clock-review",
        );
        assert.equal(
          (await page.evaluate(() => window.daidar.openFeature("pos"))).status,
          "coming-soon",
        );
      },
      { root: temp, profile },
    );
    const sentinel = path.join(profile, "business-data.keep");
    fs.writeFileSync(sentinel, "preserve existing data");
    fs.writeFileSync(
      path.join(profile, "license-state.dpapi"),
      "corrupt protected state",
    );
    await withApp(
      async (app, page) => {
        assert.equal(
          (await page.evaluate(() => window.daidar.getLicense())).status,
          "storage-error",
        );
        assert.equal(
          (await page.evaluate(() => window.daidar.openFeature("analytics")))
            .status,
          "locked",
        );
        assert.equal(
          (await page.evaluate(() => window.daidar.openFeature("sales")))
            .status,
          "coming-soon",
        );
        assert.equal(
          (
            await page.evaluate(
              (c) => window.daidar.activateLicense(c),
              activated,
            )
          ).ok,
          false,
        );
      },
      { root: temp, profile },
    );
    assert.equal(fs.readFileSync(sentinel, "utf8"), "preserve existing data");
    // Production client never accepts the ephemeral test key.
    await withApp(async (app, page) => {
      assert.equal(
        (
          await page.evaluate(
            (c) => window.daidar.activateLicense(c),
            activated,
          )
        ).ok,
        false,
      );
    });
    console.log(
      "PASS: native signed code/file activation, clipboard, device rejection, size limits, DPAPI persistence/restart, responsive page, five-day warning, expiry guard, clock rollback/restart, production trust-root isolation",
    );
  } finally {
    if (
      path.dirname(path.resolve(temp)) === path.resolve(os.tmpdir()) &&
      path.basename(temp).startsWith("daidar-license-native-")
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
