import type { License, PaidFeature } from "../../src/main/licensing/protocol";
export interface AdminLicense {
  license: License;
  code: string;
  superseded: boolean;
}
export interface AdminState {
  ready: boolean;
  vault: string;
  message: string;
  records: AdminLicense[];
}
export interface IssueInput {
  customer: string;
  deviceId: string;
  months: number;
  features: PaidFeature[];
  previousId?: string;
  reason?: string;
  confirmed?: boolean;
}
export interface AdminResult {
  ok: boolean;
  message: string;
  record?: AdminLicense;
}
export interface AdminBridge {
  state(): Promise<AdminState>;
  selectVault(): Promise<AdminState | null>;
  issue(input: IssueInput): Promise<AdminResult>;
  copy(id: string): Promise<boolean>;
  save(id: string): Promise<AdminResult | null>;
}
declare global {
  interface Window {
    licenseAdmin: AdminBridge;
  }
}
