import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridge } from "../shared/contracts";
const bridge: DesktopBridge = {
  getAppInfo: () => ipcRenderer.invoke("app:info"),
  openBrandLink: (id) => ipcRenderer.invoke("brand:open", id),
  ready: () => ipcRenderer.invoke("ui:ready"),
  openFeature: (id) => ipcRenderer.invoke("feature:open", id),
};
contextBridge.exposeInMainWorld("daidar", Object.freeze(bridge));
