import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
export type DeviceSources = Partial<
  Record<"machineGuid" | "uuid" | "bios", string>
>;
export interface DeviceIdentity {
  id: string;
  sources: DeviceSources;
}
const names = ["machineGuid", "uuid", "bios"] as const;
function normalize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replace(/\s+/g, " ");
  if (
    normalized.length < 4 ||
    normalized.length > 256 ||
    /TO BE FILLED|DEFAULT|UNKNOWN|NONE|NOT SPECIFIED|SYSTEM SERIAL|OEM/.test(
      normalized,
    ) ||
    /^[0F\s-]+$/.test(normalized)
  )
    return null;
  return normalized;
}
export function hashSources(raw: Record<string, unknown>): DeviceSources {
  const result: DeviceSources = {};
  for (const name of names) {
    const value = normalize(raw[name]);
    if (value)
      result[name] = createHash("sha256")
        .update(`daidar-flow-device-v1:${name}:${value}`)
        .digest("hex");
  }
  return result;
}
export function deriveDevice(
  raw: Record<string, unknown>,
  previous?: DeviceIdentity,
): DeviceIdentity {
  const available = hashSources(raw);
  // Preserve the selected inputs across temporary provider failures or extra sources appearing.
  if (previous) {
    const selected = Object.keys(previous.sources) as (keyof DeviceSources)[];
    const changed = selected.some(
      (name) => available[name] && available[name] !== previous.sources[name],
    );
    if (!changed) return previous;
  }
  const selected = names.filter((name) => available[name]).slice(0, 2);
  if (selected.length < 2) throw Error("Device identifiers unavailable");
  const sources: DeviceSources = Object.fromEntries(
    selected.map((name) => [name, available[name]]),
  );
  const hash = createHash("sha256")
    .update("daidar-flow-device-v1:" + JSON.stringify(sources))
    .digest("hex")
    .toUpperCase();
  return { id: "DFD1-" + hash, sources };
}
export async function readWindowsSources(): Promise<Record<string, unknown>> {
  if (process.platform !== "win32") throw Error("Windows required");
  const command =
    "$ErrorActionPreference='Stop'; $m=$null; $u=$null; $b=$null; try {$m=(Get-ItemProperty -LiteralPath 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography' -Name MachineGuid).MachineGuid} catch {}; try {$u=(Get-CimInstance Win32_ComputerSystemProduct -ErrorAction Stop).UUID} catch {}; try {$b=(Get-CimInstance Win32_BIOS -ErrorAction Stop | Select-Object -First 1).SerialNumber} catch {}; @{machineGuid=$m; uuid=$u; bios=$b} | ConvertTo-Json -Compress";
  const { stdout } = await promisify(execFile)(
    path.join(
      process.env.SystemRoot || "C:\\Windows",
      "System32/WindowsPowerShell/v1.0/powershell.exe",
    ),
    ["-NoProfile", "-NonInteractive", "-Command", command],
    { windowsHide: true, timeout: 12000, maxBuffer: 8192 },
  );
  return JSON.parse(stdout.replace(/^\uFEFF/, ""));
}
