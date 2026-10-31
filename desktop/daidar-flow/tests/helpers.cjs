const path = require("node:path");
const fs = require("node:fs"),
  os = require("node:os");
const { _electron: electron } = require("playwright");
const { expect } = require("playwright/test");
async function withApp(run, options = {}) {
  const profile =
    options.profile ||
    fs.mkdtempSync(path.join(os.tmpdir(), "daidar-native-profile-"));
  const env = { ...process.env, DAIDAR_FLOW_TEST: "1" };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    args: [
      options.root || path.resolve(__dirname, ".."),
      "--user-data-dir=" + profile,
    ],
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
    if (
      !options.profile &&
      path.dirname(path.resolve(profile)) === path.resolve(os.tmpdir()) &&
      path.basename(profile).startsWith("daidar-native-profile-")
    )
      fs.rmSync(profile, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
  }
}
module.exports = { withApp, expect };
