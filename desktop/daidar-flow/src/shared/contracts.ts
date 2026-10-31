import type { BrandLink } from "./brand";
import type { Feature, FeatureId } from "./features";
export interface AppInfo {
  name: string;
  version: string;
  edition: "free";
  features: readonly Feature[];
}
export interface DesktopBridge {
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
