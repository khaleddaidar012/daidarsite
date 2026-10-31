import { approvedBrandUrl } from "../shared/brand";
import { features, featureAccess } from "../shared/features";
import {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  net,
  session,
  dialog,
  shell,
} from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
protocol.registerSchemesAsPrivileged([
  {
    scheme: "daidar",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);
let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let initialized = false;
const origin = "daidar://app";
app
  .whenReady()
  .then(async () => {
    const root = path.resolve(__dirname, "renderer");
    protocol.handle("daidar", (request) => {
      const url = new URL(request.url);
      const relative =
        decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
      const target = path.resolve(root, relative);
      if (
        url.host !== "app" ||
        !(target === root || target.startsWith(root + path.sep))
      )
        return new Response("Forbidden", { status: 403 });
      return net.fetch(pathToFileURL(target).href);
    });
    session.defaultSession.setPermissionRequestHandler(
      (_contents, _permission, callback) => callback(false),
    );
    session.defaultSession.setPermissionCheckHandler(() => false);
    splashWindow = new BrowserWindow({
      width: 430,
      height: 350,
      frame: false,
      resizable: false,
      show: false,
      backgroundColor: "#f7fafc",
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    splashWindow.removeMenu();
    splashWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    splashWindow.webContents.on("will-navigate", (event) =>
      event.preventDefault(),
    );
    await splashWindow.loadURL(origin + "/splash.html");
    if (process.env.DAIDAR_FLOW_TEST !== "1") splashWindow.show();
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 900,
      minWidth: 360,
      minHeight: 550,
      show: false,
      backgroundColor: "#f3f7fb",
      title: "دعيدر فلو — Daidar Flow",
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    mainWindow.removeMenu();
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    mainWindow.webContents.on("will-navigate", (event) =>
      event.preventDefault(),
    );
    function trusted(event: Electron.IpcMainInvokeEvent) {
      if (
        event.sender !== mainWindow?.webContents ||
        event.senderFrame !== mainWindow.webContents.mainFrame ||
        !event.senderFrame?.url.startsWith(origin + "/")
      )
        throw Error("Untrusted IPC sender");
    }
    ipcMain.handle("app:info", (event) => {
      trusted(event);
      return {
        name: "دعيدر فلو",
        version: app.getVersion(),
        edition: "free",
        features,
      };
    });
    ipcMain.handle("brand:open", async (event, id: unknown) => {
      trusted(event);
      const url = approvedBrandUrl(id);
      if (!url) return false;
      try {
        await shell.openExternal(url);
        return true;
      } catch {
        return false;
      }
    });
    ipcMain.handle("feature:open", (event, id: unknown) => {
      trusted(event);
      return featureAccess(id);
    });
    let nativeReady = false,
      rendererReady = false;
    function reveal() {
      if (!nativeReady || !rendererReady || initialized) return;
      initialized = true;
      if (process.env.DAIDAR_FLOW_TEST !== "1") mainWindow?.show();
      splashWindow?.destroy();
      splashWindow = null;
    }
    mainWindow.once("ready-to-show", () => {
      nativeReady = true;
      reveal();
    });
    mainWindow.webContents.on("preload-error", (_event, _path, error) => {
      console.error("Preload failed", error);
      app.exit(1);
    });
    mainWindow.webContents.on("render-process-gone", () => app.exit(1));
    ipcMain.handle("ui:ready", (event) => {
      trusted(event);
      rendererReady = true;
      reveal();
    });
    await mainWindow.loadURL(origin + "/index.html");
    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  })
  .catch((error) => {
    console.error("Desktop initialization failed", error);
    if (process.env.DAIDAR_FLOW_TEST !== "1")
      dialog.showErrorBox(
        "تعذر تشغيل دعيدر فلو",
        "تعذر تحميل ملفات التطبيق. أعد التشغيل أو أعد تثبيت الملفات.",
      );
    app.exit(1);
  });
app.on("window-all-closed", () => app.quit());
