export type LicenseStatus =
  | "free"
  | "active"
  | "expiring"
  | "expired"
  | "not-started"
  | "device-mismatch"
  | "device-unavailable"
  | "invalid"
  | "storage-error"
  | "clock-review";
export interface LicenseView {
  status: LicenseStatus;
  deviceId: string | null;
  customer?: string;
  licenseId?: string;
  startsAt?: string;
  expiresAt?: string;
  remainingMs: number;
  paidFeatures: string[];
  cachedDevice: boolean;
}
export interface ActivationResult {
  ok: boolean;
  message: string;
  license: LicenseView;
}
