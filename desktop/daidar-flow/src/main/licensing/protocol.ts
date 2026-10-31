import { createHash, createPublicKey, verify } from "node:crypto";
export const paidFeatures = [
  "analytics",
  "cloud-backup",
  "employees",
  "encryption",
  "suppliers",
] as const;
export type PaidFeature = (typeof paidFeatures)[number];
export type Months = 1 | 3 | 6 | 12;
export interface License {
  v: 1;
  product: "daidar-flow-desktop";
  keyId: string;
  licenseId: string;
  customer: string;
  deviceId: string;
  issuedAt: string;
  startsAt: string;
  expiresAt: string;
  months: Months;
  features: PaidFeature[];
  replaces: string | null;
}
export type TrustKeys = Record<string, string>;
export const MAX_LICENSE_BYTES = 16384;
export const devicePattern = /^DFD1-[A-F0-9]{64}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function keyId(pem: string): string {
  const key = createPublicKey(pem);
  if (key.asymmetricKeyType !== "ed25519") throw Error("Invalid key type");
  return createHash("sha256")
    .update(key.export({ type: "spki", format: "der" }))
    .digest("hex")
    .slice(0, 16);
}
export function addMonths(start: string, months: Months): string {
  if (![1, 3, 6, 12].includes(months)) throw Error("Invalid duration");
  const date = new Date(start),
    day = date.getUTCDate();
  if (!Number.isFinite(date.getTime())) throw Error("Invalid start date");
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.toISOString();
}
export function canonical(value: License): string {
  return JSON.stringify({
    v: value.v,
    product: value.product,
    keyId: value.keyId,
    licenseId: value.licenseId,
    customer: value.customer,
    deviceId: value.deviceId,
    issuedAt: value.issuedAt,
    startsAt: value.startsAt,
    expiresAt: value.expiresAt,
    months: value.months,
    features: value.features,
    replaces: value.replaces,
  });
}
function timestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}
function validate(value: unknown): asserts value is License {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid payload");
  const p = value as License;
  if (
    p.v !== 1 ||
    p.product !== "daidar-flow-desktop" ||
    !/^[a-f0-9]{16}$/.test(p.keyId) ||
    typeof p.licenseId !== "string" ||
    !uuid.test(p.licenseId) ||
    typeof p.deviceId !== "string" ||
    !devicePattern.test(p.deviceId) ||
    typeof p.customer !== "string" ||
    !p.customer.trim() ||
    p.customer.length > 160 ||
    /[\x00-\x1f]/.test(p.customer) ||
    !timestamp(p.issuedAt) ||
    !timestamp(p.startsAt) ||
    !timestamp(p.expiresAt) ||
    ![1, 3, 6, 12].includes(p.months) ||
    addMonths(p.startsAt, p.months) !== p.expiresAt ||
    Date.parse(p.issuedAt) >= Date.parse(p.expiresAt) ||
    !Array.isArray(p.features) ||
    !p.features.length ||
    p.features.length > paidFeatures.length ||
    p.features.some((id) => !paidFeatures.includes(id)) ||
    new Set(p.features).size !== p.features.length ||
    JSON.stringify(p.features) !== JSON.stringify([...p.features].sort()) ||
    !(
      p.replaces === null ||
      (typeof p.replaces === "string" && uuid.test(p.replaces))
    )
  )
    throw Error("Invalid schema");
  if (
    Object.keys(p).sort().join() !==
    Object.keys(JSON.parse(canonical(p)))
      .sort()
      .join()
  )
    throw Error("Unknown fields");
}
function decode(value: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw Error("Invalid base64url");
  const bytes = Buffer.from(value, "base64url");
  if (bytes.toString("base64url") !== value)
    throw Error("Noncanonical base64url");
  return bytes;
}
export function verifyLicense(code: unknown, keys: TrustKeys): License {
  if (typeof code !== "string" || Buffer.byteLength(code) > MAX_LICENSE_BYTES)
    throw Error("Invalid input");
  const parts = code.trim().split(".");
  if (parts.length !== 3 || parts[0] !== "DFL1")
    throw Error("Invalid envelope");
  const bytes = decode(parts[1]),
    signature = decode(parts[2]);
  const payload: unknown = JSON.parse(bytes.toString("utf8"));
  validate(payload);
  const pem = Object.hasOwn(keys, payload.keyId)
    ? keys[payload.keyId]
    : undefined;
  if (
    !pem ||
    keyId(pem) !== payload.keyId ||
    signature.length !== 64 ||
    !verify(null, bytes, pem, signature) ||
    !bytes.equals(Buffer.from(canonical(payload), "utf8"))
  )
    throw Error("Invalid signature");
  return payload;
}
