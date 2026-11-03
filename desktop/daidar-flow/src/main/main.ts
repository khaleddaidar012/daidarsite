import { approvedBrandUrl } from "../shared/brand";
import { EcosystemAccount } from './ecosystem';
import { features } from "../shared/features";
import { LicenseService } from "./licensing/service";
import { protectedStore } from "./licensing/storage";
import { readWindowsSources } from "./licensing/device";
import publicKeys from "./licensing/public-keys.json";
import { MAX_LICENSE_BYTES } from "./licensing/protocol";
import fs from "node:fs/promises";
import { readBounded } from "./licensing/files";
import { ProductsStore, inventoryResult } from "./inventory/store";
import {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  net,
  session,
  dialog,
  shell,
  clipboard,
  safeStorage,
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
const primaryInstance = app.requestSingleInstanceLock();
if (!primaryInstance) app.quit();
app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});
app
  .whenReady()
  .then(async () => {
    if (!primaryInstance) return;
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
    const licensing = new LicenseService({
      store: protectedStore(app.getPath("userData")),
      keys: publicKeys,
      readDevice: readWindowsSources,
    });
    await licensing.initialize();
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
    let products: ProductsStore | null = null;
    const inventory = () =>
      products ??
      (products = new ProductsStore(
        path.join(app.getPath("userData"), "inventory.sqlite"),
      ));
    ipcMain.handle("inventory:list", (event, input: unknown) => {
      trusted(event);
      return inventoryResult(() => inventory().list(input));
    });
    ipcMain.handle("inventory:create", (event, input: unknown) => {
      trusted(event);
      return inventoryResult(() => inventory().create(input));
    });
    ipcMain.handle("inventory:update", (event, input: unknown) => {
      trusted(event);
      return inventoryResult(() => inventory().update(input));
    });
    ipcMain.handle("inventory:remove", (event, input: unknown) => {
      trusted(event);
      return inventoryResult(() => inventory().remove(input));
    });
    app.once("before-quit", () => {
      try {
        products?.close();
      } catch {
        /* WAL remains recoverable; never delete files on close errors. */
      }
    });
    ipcMain.handle("app:info", async (event) => {
      trusted(event);
      const license = await licensing.status();
      return {
        name: "دعيدر فلو",
        version: app.getVersion(),
        edition: license.paidFeatures.length ? "paid" : "free",
        license,
        features,
      };
    });
    ipcMain.handle("license:status", (event) => {
      trusted(event);
      return licensing.status();
    });
    ipcMain.handle("license:activate", (event, code: unknown) => {
      trusted(event);
      return licensing.activate(code);
    });
    ipcMain.handle("license:copy-device", async (event) => {
      trusted(event);
      const id = (await licensing.status()).deviceId;
      if (!id) return false;
      clipboard.writeText(id);
      return true;
    });
    let importing = false;
    ipcMain.handle("license:import", async (event) => {
      trusted(event);
      if (importing || !mainWindow) return null;
      importing = true;
      try {
        const choice = await dialog.showOpenDialog(mainWindow, {
          title: "اختر ملف الترخيص الموقع",
          properties: ["openFile"],
          filters: [
            { name: "Daidar Flow license", extensions: ["dfl", "lic", "txt"] },
          ],
        });
        if (choice.canceled || !choice.filePaths[0]) return null;
        const file = await fs.open(choice.filePaths[0], "r");
        let code: string;
        try {
          code = (await readBounded(file, MAX_LICENSE_BYTES)).toString("utf8");
        } finally {
          await file.close();
        }
        return await licensing.activate(code);
      } catch {
        return {
          ok: false,
          message: "تعذر قراءة ملف الترخيص أو حجمه أكبر من المسموح.",
          license: await licensing.status(),
        };
      } finally {
        importing = false;
      }
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
    const ecosystemAccount=new EcosystemAccount({directory:app.getPath('userData'),origin:process.env.DAIDAR_ECOSYSTEM_ORIGIN||'https://daidarsoluations.com',encrypt(value){if(!safeStorage.isEncryptionAvailable())throw Error('التخزين الآمن غير متاح');return safeStorage.encryptString(value)},decrypt(value){if(!safeStorage.isEncryptionAvailable())throw Error('التخزين الآمن غير متاح');return safeStorage.decryptString(value)},open:async url=>{await shell.openExternal(url)}});
    ipcMain.handle('ecosystem:status',event=>{trusted(event);return ecosystemAccount.status()});
    ipcMain.handle('ecosystem:start',async event=>{trusted(event);const license=await licensing.status();return ecosystemAccount.start(license.deviceId||'')});
    ipcMain.handle('ecosystem:complete',event=>{trusted(event);return ecosystemAccount.complete()});
    ipcMain.handle('ecosystem:logout',event=>{trusted(event);return ecosystemAccount.logout()});
    ipcMain.handle("feature:open", (event, id: unknown) => {
      trusted(event);
      return licensing.openFeature(id);
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
