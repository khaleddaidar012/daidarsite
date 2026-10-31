const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const { withApp, expect } = require("./helpers.cjs");
withApp(async (app, page) => {
  fs.mkdirSync(path.join(__dirname, "../artifacts"), { recursive: true });
  for (const [width, height, columns] of [
    [1280, 950, 3],
    [768, 900, 2],
    [360, 800, 1],
  ]) {
    await app.evaluate(
      ({ BrowserWindow }, { width, height }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().endsWith("/index.html"))
          .setContentSize(width, height),
      { width, height },
    );
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(width);
    const layout = await page.evaluate(() => {
      const grid = document.querySelector(".feature-grid"),
        footer = document.querySelector(".app-footer");
      return {
        columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
        overflow: document.documentElement.scrollWidth > innerWidth,
        footerBottom: footer.getBoundingClientRect().bottom,
        viewportHeight: innerHeight,
        cards: [...document.querySelectorAll(".feature-card")].map((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, height: r.height };
        }),
      };
    });
    assert.equal(layout.columns, columns);
    assert.equal(layout.overflow, false);
    assert.ok(layout.footerBottom <= layout.viewportHeight + 1);
    assert.ok(layout.cards.every((c) => c.left >= 0 && c.right <= width));
    if (width === 1280)
      assert.ok(
        Math.max(...layout.cards.map((c) => c.height)) -
          Math.min(...layout.cards.map((c) => c.height)) <
          2,
      );
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(
        __dirname,
        "../artifacts",
        width === 1280
          ? "dashboard-desktop.png"
          : width === 768
            ? "dashboard-tablet.png"
            : "dashboard-narrow.png",
      ),
    });
    console.log(
      "PASS: " +
        width +
        "px — " +
        columns +
        " columns, no clipping, footer visible",
    );
  }
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement.tagName),
    "BUTTON",
  );
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
