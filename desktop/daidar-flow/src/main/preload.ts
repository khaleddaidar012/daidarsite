import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridge } from "../shared/contracts";
import type { InventoryBridge } from "../shared/inventory";
const inventory: InventoryBridge = {
  list: (input) => ipcRenderer.invoke("inventory:list", input),
  create: (input) => ipcRenderer.invoke("inventory:create", input),
  update: (input) => ipcRenderer.invoke("inventory:update", input),
  remove: (input) => ipcRenderer.invoke("inventory:remove", input),
};
const bridge: DesktopBridge = {
  getEcosystemAccount:()=>ipcRenderer.invoke('ecosystem:status'),
  startEcosystemLogin:()=>ipcRenderer.invoke('ecosystem:start'),
  completeEcosystemLogin:()=>ipcRenderer.invoke('ecosystem:complete'),
  logoutEcosystem:()=>ipcRenderer.invoke('ecosystem:logout'),
  inventory: Object.freeze(inventory),
  getLicense: () => ipcRenderer.invoke("license:status"),
  activateLicense: (code) => ipcRenderer.invoke("license:activate", code),
  importLicense: () => ipcRenderer.invoke("license:import"),
  copyDeviceId: () => ipcRenderer.invoke("license:copy-device"),
  getAppInfo: () => ipcRenderer.invoke("app:info"),
  openBrandLink: (id) => ipcRenderer.invoke("brand:open", id),
  ready: () => ipcRenderer.invoke("ui:ready"),
  openFeature: (id) => ipcRenderer.invoke("feature:open", id),
};
contextBridge.exposeInMainWorld("daidar", Object.freeze(bridge));
