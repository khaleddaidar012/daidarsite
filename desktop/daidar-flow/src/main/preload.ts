import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridge } from "../shared/contracts";
const bridge: DesktopBridge = {
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
