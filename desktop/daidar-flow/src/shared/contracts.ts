import type { BrandLink } from "./brand";
import type { Feature, FeatureId } from "./features";
import type { ActivationResult, LicenseView } from "./licensing";
import type { InventoryBridge } from "./inventory";
export interface AppInfo {
  name: string;
  version: string;
  edition: "free" | "paid";
  license: LicenseView;
  features: readonly Feature[];
}
export interface DesktopBridge {
  inventory: InventoryBridge;
  getLicense(): Promise<LicenseView>;
  activateLicense(code: string): Promise<ActivationResult>;
  importLicense(): Promise<ActivationResult | null>;
  copyDeviceId(): Promise<boolean>;
  getAppInfo(): Promise<AppInfo>;
  openBrandLink(id: BrandLink): Promise<boolean>;
  ready(): Promise<void>;
  openFeature(
    id: FeatureId,
  ): Promise<{ status: "invalid" | "coming-soon" | "locked"; title?: string }>;
}
declare global {
  interface Window {
    daidar: DesktopBridge;
  }
}
