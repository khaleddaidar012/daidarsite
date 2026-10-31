import { features } from "../../shared/features";
import type { ActivationResult, LicenseView } from "../../shared/licensing";
import {
  deriveDevice,
  hashSources,
  type DeviceIdentity,
  type DeviceSources,
} from "./device";
import {
  devicePattern,
  verifyLicense,
  type License,
  type TrustKeys,
} from "./protocol";
export interface State {
  v: 1;
  device: DeviceIdentity;
  code: string | null;
  lastSeen: number;
  clockReview: boolean;
}
export interface Store {
  read(): Promise<unknown | null>;
  write(state: State): Promise<void>;
}
export interface Dependencies {
  store: Store;
  keys: TrustKeys;
  readDevice(): Promise<Record<string, unknown>>;
  now?: () => number;
  monotonic?: () => number;
}
function validState(value: unknown): value is State {
  if (!value || typeof value !== "object") return false;
  const s = value as State;
  return (
    s.v === 1 &&
    typeof s.device?.id === "string" &&
    devicePattern.test(s.device.id) &&
    !!s.device.sources &&
    Object.keys(s.device.sources).length >= 2 &&
    Object.keys(s.device.sources).length <= 3 &&
    Object.entries(s.device.sources).every(
      ([k, v]) =>
        ["machineGuid", "uuid", "bios"].includes(k) &&
        typeof v === "string" &&
        /^[a-f0-9]{64}$/.test(v),
    ) &&
    (s.code === null ||
      (typeof s.code === "string" && Buffer.byteLength(s.code) <= 16384)) &&
    Number.isSafeInteger(s.lastSeen) &&
    s.lastSeen > 0 &&
    s.lastSeen < 8640000000000000 &&
    typeof s.clockReview === "boolean"
  );
}
export class LicenseService {
  private state: State | null = null;
  private device: DeviceIdentity | null = null;
  private storageError = false;
  private cachedDevice = false;
  private queue: Promise<unknown> = Promise.resolve();
  private now: () => number;
  private monotonic: () => number;
  private anchorTime = 0;
  private anchorMono = 0;
  private effectiveTime = 0;
  private lastPersisted = 0;
  constructor(private dependencies: Dependencies) {
    this.now = dependencies.now ?? (() => Date.now());
    this.monotonic = dependencies.monotonic ?? (() => performance.now());
  }
  private serial<T>(action: () => Promise<T>): Promise<T> {
    const next = this.queue.then(action);
    this.queue = next.catch(() => {});
    return next;
  }
  async initialize() {
    let previous: State | null = null;
    try {
      const value = await this.dependencies.store.read();
      if (value !== null) {
        if (!validState(value)) throw Error("Invalid state");
        previous = value;
      }
    } catch {
      this.storageError = true;
    }
    let raw = {};
    try {
      raw = await this.dependencies.readDevice();
    } catch {
      /* cached protected inputs only */
    }
    try {
      this.device = deriveDevice(raw, previous?.device);
      const available = hashSources(raw);
      this.cachedDevice =
        !!previous &&
        Object.keys(previous.device.sources).some(
          (key) => !available[key as keyof DeviceSources],
        );
    } catch {
      this.device = null;
    }
    this.state =
      previous ??
      (this.device
        ? {
            v: 1,
            device: this.device,
            code: null,
            lastSeen: this.now(),
            clockReview: false,
          }
        : null);
    this.anchorTime = Math.max(this.now(), this.state?.lastSeen ?? 0);
    this.anchorMono = this.monotonic();
    this.effectiveTime = this.anchorTime;
    if (!this.storageError && this.state) await this.checkpoint(true);
  }
  private async save(): Promise<boolean> {
    if (!this.state || this.storageError) return false;
    try {
      await this.dependencies.store.write(this.state);
      this.lastPersisted = this.monotonic();
      return true;
    } catch {
      this.storageError = true;
      return false;
    }
  }
  private async checkpoint(force = false) {
    if (!this.state || this.storageError) return;
    const wall = this.now(),
      elapsed = Math.max(0, this.monotonic() - this.anchorMono);
    const expected = this.anchorTime + elapsed;
    const oldReview = this.state.clockReview;
    if (wall + 300000 < Math.max(this.state.lastSeen, expected))
      this.state.clockReview = true;
    else if (
      this.state.clockReview &&
      wall >= this.state.lastSeen &&
      wall + 300000 >= expected
    )
      this.state.clockReview = false;
    this.effectiveTime = Math.max(wall, expected, this.state.lastSeen);
    this.state.lastSeen = Math.ceil(this.effectiveTime);
    if (
      force ||
      oldReview !== this.state.clockReview ||
      this.monotonic() - this.lastPersisted >= 30000
    )
      await this.save();
  }
  private evaluate(): LicenseView {
    const base: LicenseView = {
      status: "free",
      deviceId: this.device?.id ?? null,
      remainingMs: 0,
      paidFeatures: [],
      cachedDevice: this.cachedDevice,
    };
    if (this.storageError) return { ...base, status: "storage-error" };
    if (!this.device || !this.state)
      return { ...base, status: "device-unavailable" };
    if (!this.state.code)
      return this.state.clockReview
        ? { ...base, status: "clock-review" }
        : base;
    let license: License;
    try {
      license = verifyLicense(this.state.code, this.dependencies.keys);
    } catch {
      return { ...base, status: "invalid" };
    }
    const view = {
      ...base,
      customer: license.customer,
      licenseId: license.licenseId,
      startsAt: license.startsAt,
      expiresAt: license.expiresAt,
    };
    if (this.state.clockReview) return { ...view, status: "clock-review" };
    if (license.deviceId !== this.device.id)
      return { ...view, status: "device-mismatch" };
    const now = this.effectiveTime;
    if (
      Date.parse(license.issuedAt) > now + 300000 ||
      Date.parse(license.startsAt) > now
    )
      return { ...view, status: "not-started" };
    const remainingMs = Math.max(0, Date.parse(license.expiresAt) - now);
    if (!remainingMs) return { ...view, status: "expired" };
    return {
      ...view,
      status: remainingMs <= 5 * 86400000 ? "expiring" : "active",
      remainingMs,
      paidFeatures: [...license.features],
    };
  }
  status(): Promise<LicenseView> {
    return this.serial(async () => {
      await this.checkpoint();
      return this.evaluate();
    });
  }
  activate(code: unknown): Promise<ActivationResult> {
    return this.serial(async () => {
      await this.checkpoint(true);
      const failure = (message: string): ActivationResult => ({
        ok: false,
        message,
        license: this.evaluate(),
      });
      if (this.storageError || !this.state || !this.device)
        return failure("تعذر التفعيل: راجع حالة التخزين ومعرف الجهاز.");
      if (this.state.clockReview)
        return failure(
          "صحّح ساعة Windows إلى الوقت الحقيقي أولًا. استيراد ترخيص لا يلغي حماية الساعة.",
        );
      let license: License;
      try {
        license = verifyLicense(code, this.dependencies.keys);
      } catch {
        return failure(
          "كود الترخيص أو توقيعه غير صالح. تأكد من إصدار الإدارة.",
        );
      }
      if (license.deviceId !== this.device.id)
        return failure(
          "هذا الترخيص لجهاز آخر. أرسل معرف جهازك للإدارة لإعادة الإصدار.",
        );
      if (Date.parse(license.expiresAt) <= this.effectiveTime)
        return failure("انتهت صلاحية هذا الترخيص. اطلب تجديد الاشتراك.");
      if (Date.parse(license.issuedAt) > this.effectiveTime + 300000)
        return failure(
          "تاريخ الإصدار في المستقبل. راجع ساعة الجهاز أو الإدارة.",
        );
      const previous = this.state;
      this.state = {
        ...previous,
        device: this.device,
        code: (code as string).trim(),
      };
      if (!(await this.save()))
        return failure("تعذر حفظ التفعيل بأمان. لم تُفتح الميزات المدفوعة.");
      return {
        ok: true,
        message:
          Date.parse(license.startsAt) > this.effectiveTime
            ? "تم حفظ الترخيص. يبدأ الاشتراك في الموعد الموضح."
            : "تم التفعيل بنجاح.",
        license: this.evaluate(),
      };
    });
  }
  openFeature(input: unknown) {
    return this.serial(async () => {
      const feature = features.find((item) => item.id === input);
      if (!feature) return { status: "invalid" as const };
      if (feature.tier === "free")
        return { status: "coming-soon" as const, title: feature.title };
      await this.checkpoint(true);
      const license = this.evaluate();
      return {
        status: license.paidFeatures.includes(feature.id)
          ? ("coming-soon" as const)
          : ("locked" as const),
        title: feature.title,
      };
    });
  }
}
