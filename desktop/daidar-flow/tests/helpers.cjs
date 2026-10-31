const path = require("node:path");
const { _electron: electron } = require("playwright");
const { expect } = require("playwright/test");
async function withApp(run) {
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
    await run(app, page);
  } finally {
    await app.close();
  }
}
module.exports = { withApp, expect };
