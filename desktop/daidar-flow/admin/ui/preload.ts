import { contextBridge, ipcRenderer } from "electron";
import type { AdminBridge } from "./contracts";
const bridge: AdminBridge = {
  state: () => ipcRenderer.invoke("admin:state"),
  selectVault: () => ipcRenderer.invoke("admin:vault"),
  issue: (input) => ipcRenderer.invoke("admin:issue", input),
  copy: (id) => ipcRenderer.invoke("admin:copy", id),
  save: (id) => ipcRenderer.invoke("admin:save", id),
};
contextBridge.exposeInMainWorld("licenseAdmin", Object.freeze(bridge));
