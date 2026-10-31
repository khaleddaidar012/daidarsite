import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  clipboard,
  session,
} from "electron";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { executeAdmin } from "../service";
import {
  verifyLicense,
  paidFeatures,
  devicePattern,
} from "../../src/main/licensing/protocol";
import publicKeys from "../../src/main/licensing/public-keys.json";
import type { AdminLicense, AdminState, IssueInput } from "./contracts";
app.setName("Daidar Flow License Admin");
if (!app.commandLine.hasSwitch("user-data-dir"))
  app.setPath(
    "userData",
    path.join(app.getPath("appData"), "DaidarFlowLicenseAdminUI"),
  );
const primary = app.requestSingleInstanceLock();
if (!primary) app.quit();
let window: BrowserWindow | null = null;
let vault = path.join(process.env.LOCALAPPDATA || "", "DaidarFlowAdmin");
let busy = false;
function records(): AdminLicense[] {
  const file = path.join(vault, "ledger.json");
  if (fs.statSync(file).size > 16 * 1024 * 1024)
    throw Error("Ledger too large");
  const entries: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(entries)) throw Error("Invalid ledger");
  return entries
    .map((entry) => {
      if (
        !entry ||
        typeof entry.code !== "string" ||
        !["issued", "superseded"].includes(entry.status)
      )
        throw Error("Invalid record");
      const license = verifyLicense(entry.code, publicKeys);
      if (entry.id !== license.licenseId || entry.deviceId !== license.deviceId)
        throw Error("Ledger mismatch");
      return {
        license,
        code: entry.code,
        superseded: entry.status === "superseded",
      };
    })
    .reverse();
}
function state(): AdminState {
  try {
    if (!fs.existsSync(path.join(vault, "signing-private.dpapi")))
      throw Error("Missing vault");
    const keys = JSON.parse(
      fs.readFileSync(path.join(vault, "public-keys.json"), "utf8"),
    );
    if (
      !Object.keys(keys).length ||
      Object.entries(keys).some(
        ([id, pem]) => (publicKeys as Record<string, string>)[id] !== pem,
      )
    )
      throw Error("Untrusted vault");
    return {
      ready: true,
      vault,
      message: "خزنة الإدارة جاهزة ومتوافقة مع تطبيق العميل",
      records: records(),
    };
  } catch {
    return {
      ready: false,
      vault,
      message:
        "تعذر فتح الخزنة المتوافقة. اختر خزنة الإدارة الأصلية، وبنفس حساب Windows الذي أنشأها.",
      records: [],
    };
  }
}
function record(id: unknown): AdminLicense {
  if (typeof id !== "string" || id.length > 40) throw Error("Invalid ID");
  const found = records().find(
    (item) => item.license.licenseId === id && !item.superseded,
  );
  if (!found) throw Error("Unknown/superseded record");
  return found;
}
app.on("second-instance", () => {
  window?.restore();
  window?.show();
  window?.focus();
});
app
  .whenReady()
  .then(async () => {
    if (!primary) return;
    const url = pathToFileURL(path.join(__dirname, "renderer/index.html")).href;
    session.defaultSession.setPermissionRequestHandler((_w, _p, callback) =>
      callback(false),
    );
    session.defaultSession.setPermissionCheckHandler(() => false);
    window = new BrowserWindow({
      width: 1220,
      height: 860,
      minWidth: 390,
      minHeight: 580,
      show: false,
      title: "إدارة تراخيص دعيدر فلو",
      backgroundColor: "#f3f7fb",
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    window.removeMenu();
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event) => event.preventDefault());
    session.defaultSession.on("will-download", (event) =>
      event.preventDefault(),
    );
    function trusted(event: Electron.IpcMainInvokeEvent) {
      if (
        event.sender !== window?.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame?.url !== url
      )
        throw Error("Untrusted sender");
    }
    ipcMain.handle("admin:state", (event) => {
      trusted(event);
      return state();
    });
    ipcMain.handle("admin:vault", async (event) => {
      trusted(event);
      if (busy || !window) return null;
      busy = true;
      try {
        const choice = await dialog.showOpenDialog(window, {
          title: "اختر خزنة إدارة التراخيص",
          defaultPath: vault,
          properties: ["openDirectory"],
        });
        if (choice.canceled || !choice.filePaths[0]) return null;
        vault = choice.filePaths[0];
        return state();
      } finally {
        busy = false;
      }
    });
    ipcMain.handle("admin:issue", (event, input: unknown) => {
      trusted(event);
      if (busy) return { ok: false, message: "انتظر انتهاء العملية الحالية." };
      busy = true;
      try {
        if (!state().ready) throw Error("Vault unavailable");
        if (!input || typeof input !== "object") throw Error("Invalid form");
        const v = input as IssueInput;
        if (
          typeof v.customer !== "string" ||
          v.customer.length > 160 ||
          typeof v.deviceId !== "string" ||
          !devicePattern.test(v.deviceId.trim().toUpperCase()) ||
          ![1, 3, 6, 12].includes(v.months) ||
          !Array.isArray(v.features) ||
          !v.features.length ||
          v.features.length > 5 ||
          new Set(v.features).size !== v.features.length ||
          v.features.some((id) => !paidFeatures.includes(id))
        )
          return {
            ok: false,
            message: "راجع اسم العميل ومعرف الجهاز والمدة والمميزات المختارة.",
          };
        const options: Record<string, string> = {
          "--vault": vault,
          "--device": v.deviceId.trim().toUpperCase(),
          "--customer": v.customer.trim() || "عميل بدون اسم",
          "--months": String(v.months),
          "--features": [...v.features].sort().join(","),
          "--out": path.join(vault, "issued", randomUUID() + ".dfl"),
        };
        let command = "issue";
        if (v.previousId !== undefined) {
          const old = record(v.previousId);
          if (
            v.confirmed !== true ||
            typeof v.reason !== "string" ||
            !v.reason.trim() ||
            v.reason.length > 1000
          )
            return {
              ok: false,
              message:
                "أدخل سبب تغيير الجهاز وأكّد إيقاف استخدام الجهاز القديم.",
            };
          // Export only the selected trusted ledger record; never accept renderer file paths.
          const previous = path.join(
            vault,
            "issued",
            old.license.licenseId + "-transfer-source.dfl",
          );
          if (!fs.existsSync(previous))
            executeAdmin("export", {
              "--vault": vault,
              "--license": old.license.licenseId,
              "--out": previous,
            });
          options["--previous"] = previous;
          options["--reason"] = v.reason.trim();
          options["--confirm-transfer"] = "yes";
          command = "reissue";
        }
        const result = executeAdmin(command, options);
        if (!result.license || !result.code) throw Error("No signed result");
        return {
          ok: true,
          message:
            command === "reissue"
              ? "تم نقل الترخيص بنفس تاريخ الانتهاء."
              : "تم إصدار الترخيص وحفظه في سجل الإدارة.",
          record: {
            license: result.license,
            code: result.code,
            superseded: false,
          },
        };
      } catch (error) {
        const locked = (error as NodeJS.ErrnoException).code === "EEXIST";
        return {
          ok: false,
          message: locked
            ? "هناك عملية إدارة أخرى تعمل أو ملف موجود بالفعل. أغلق العملية الأخرى ثم أعد المحاولة."
            : "تعذر الإصدار. راجع الخزنة وحساب Windows؛ النقل يتطلب جهازًا مختلفًا وترخيصًا غير منتهٍ. راجع السجل قبل إعادة الإصدار، فقد يكون الكود محفوظًا بالفعل.",
        };
      } finally {
        busy = false;
      }
    });
    ipcMain.handle("admin:copy", (event, id: unknown) => {
      trusted(event);
      try {
        clipboard.writeText(record(id).code);
        return true;
      } catch {
        return false;
      }
    });
    ipcMain.handle("admin:save", async (event, id: unknown) => {
      trusted(event);
      if (busy || !window) return null;
      busy = true;
      try {
        const current = record(id);
        const choice = await dialog.showSaveDialog(window, {
          title: "حفظ ملف الترخيص للعميل",
          defaultPath: path.join(
            app.getPath("documents"),
            "Daidar-Licenses",
            current.license.licenseId + ".dfl",
          ),
          filters: [{ name: "Daidar Flow License", extensions: ["dfl"] }],
        });
        if (choice.canceled || !choice.filePath) return null;
        executeAdmin("export", {
          "--vault": vault,
          "--license": current.license.licenseId,
          "--out": choice.filePath,
        });
        return {
          ok: true,
          message: "تم حفظ ملف الترخيص في المكان الذي اخترته.",
        };
      } catch {
        return {
          ok: false,
          message: "تعذر الحفظ. اختر اسم ملف جديدًا خارج مجلد المشروع.",
        };
      } finally {
        busy = false;
      }
    });
    window.once("ready-to-show", () => {
      if (process.env.DAIDAR_FLOW_TEST !== "1") window?.show();
    });
    await window.loadURL(url);
  })
  .catch(() => {
    dialog.showErrorBox(
      "تعذر تشغيل إدارة التراخيص",
      "راجع ملفات أداة الإدارة وأعد التشغيل.",
    );
    app.exit(1);
  });
app.on("window-all-closed", () => app.quit());
