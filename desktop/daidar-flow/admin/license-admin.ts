// Administrator-only executable. Never imported by main/preload/renderer.
import {
  generateKeyPairSync,
  createPrivateKey,
  createPublicKey,
  randomUUID,
  sign,
  createHash,
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  addMonths,
  canonical,
  devicePattern,
  keyId,
  paidFeatures,
  verifyLicense,
  MAX_LICENSE_BYTES,
  type License,
  type Months,
} from "../src/main/licensing/protocol";

const args = process.argv.slice(2),
  command = args.shift();
const options: Record<string, string> = {};
for (let i = 0; i < args.length; i++) {
  const name = args[i];
  if (!/^--[a-z-]+$/.test(name) || Object.hasOwn(options, name))
    throw Error("Invalid/duplicate option");
  if (name === "--confirm-transfer") options[name] = "yes";
  else {
    if (!args[i + 1] || args[i + 1].startsWith("--"))
      throw Error("Missing option value");
    options[name] = args[++i];
  }
}
const allowed = new Set([
  "--vault",
  "--public-out",
  "--out",
  "--device",
  "--customer",
  "--months",
  "--start",
  "--features",
  "--previous",
  "--reason",
  "--confirm-transfer",
  "--license",
]);
if (Object.keys(options).some((name) => !allowed.has(name)))
  throw Error("Unknown option");
function external(input: string): string {
  const target = path.resolve(input);
  // Resolve existing ancestors to reject vault/output junctions pointing into the repository.
  let parent = target;
  while (!fs.existsSync(parent)) parent = path.dirname(parent);
  let ancestor = fs.statSync(parent).isDirectory()
    ? fs.realpathSync(parent)
    : path.dirname(fs.realpathSync(parent));
  for (;;) {
    if (fs.existsSync(path.join(ancestor, ".git")))
      throw Error(
        "Private vault and customer licenses must stay outside any Git repository",
      );
    const next = path.dirname(ancestor);
    if (next === ancestor) break;
    ancestor = next;
  }
  return target;
}
function required(name: string): string {
  if (!options[name]) throw Error("Required: " + name);
  return options[name];
}
function dpapi(input: Buffer, decrypt = false): Buffer {
  if (process.platform !== "win32")
    throw Error("Administrator vault requires Windows DPAPI");
  const operation = decrypt ? "Unprotect" : "Protect";
  const script = `$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::${operation}($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))`;
  const result = execFileSync(
    path.join(
      process.env.SystemRoot || "C:\\Windows",
      "System32/WindowsPowerShell/v1.0/powershell.exe",
    ),
    ["-NoProfile", "-NonInteractive", "-Command", script],
    {
      input: input.toString("base64"),
      windowsHide: true,
      timeout: 10000,
      maxBuffer: 65536,
    },
  );
  return Buffer.from(result.toString().trim(), "base64");
}
interface RecordEntry {
  id: string;
  deviceId: string;
  code: string;
  codeHash: string;
  status: "issued" | "superseded";
  replaces: string | null;
  reason: string | null;
  at: string;
}
function run() {
  if (
    !["init", "issue", "reissue", "inspect", "export"].includes(command || "")
  )
    throw Error(
      "Commands: init | issue | reissue | inspect | export. See admin/README.md",
    );
  const vault = external(
    options["--vault"] ||
      path.join(process.env.LOCALAPPDATA || "", "DaidarFlowAdmin"),
  );
  fs.mkdirSync(vault, { recursive: true });
  const lock = path.join(vault, "admin.lock");
  const fd = fs.openSync(lock, "wx");
  try {
    const privateFile = path.join(vault, "signing-private.dpapi");
    const publicFile = path.join(vault, "public-keys.json");
    const ledgerFile = path.join(vault, "ledger.json");
    if (command === "init") {
      if (
        fs.existsSync(privateFile) ||
        fs.existsSync(publicFile) ||
        fs.existsSync(ledgerFile)
      )
        throw Error("Vault already initialized; never overwrite signing keys");
      const publicOut = path.resolve(required("--public-out"));
      if (fs.existsSync(publicOut))
        throw Error(
          "Public output already exists; merge public trust roots explicitly",
        );
      const pair = generateKeyPairSync("ed25519");
      const pem = pair.publicKey
        .export({ type: "spki", format: "pem" })
        .toString();
      const encoded = JSON.stringify({ [keyId(pem)]: pem }, null, 2) + "\n";
      const secret = pair.privateKey.export({ type: "pkcs8", format: "der" });
      const protectedKey = dpapi(secret);
      secret.fill(0);
      fs.writeFileSync(privateFile, protectedKey, { flag: "wx", mode: 0o600 });
      fs.writeFileSync(publicFile, encoded, { flag: "wx" });
      fs.writeFileSync(ledgerFile, "[]\n", { flag: "wx", mode: 0o600 });
      fs.mkdirSync(path.dirname(publicOut), { recursive: true });
      fs.writeFileSync(publicOut, encoded, { flag: "wx" });
      console.log(
        "Initialized external DPAPI vault. Public verification keys exported. Back up the vault using a protected Windows account backup.",
      );
      return;
    }
    const keys = JSON.parse(fs.readFileSync(publicFile, "utf8"));
    const records: RecordEntry[] = JSON.parse(
      fs.readFileSync(ledgerFile, "utf8"),
    );
    function readCode(file: string) {
      const target = path.resolve(file);
      const fd = fs.openSync(target, "r");
      try {
        if (
          !fs.fstatSync(fd).isFile() ||
          fs.fstatSync(fd).size > MAX_LICENSE_BYTES
        )
          throw Error("License file too large");
        return fs.readFileSync(fd, "utf8").trim();
      } finally {
        fs.closeSync(fd);
      }
    }
    if (command === "inspect") {
      console.log(
        JSON.stringify(
          verifyLicense(readCode(required("--previous")), keys),
          null,
          2,
        ),
      );
      return;
    }
    const out = external(required("--out"));
    if (fs.existsSync(out)) throw Error("Output exists; choose a new filename");
    if (command === "export") {
      const record = records.find(
        (entry) => entry.id === required("--license"),
      );
      if (!record || record.status !== "issued" || !record.code)
        throw Error("No active license in ledger");
      verifyLicense(record.code, keys);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, record.code + "\n", { flag: "wx", mode: 0o600 });
      console.log("Existing signed license exported from ledger.");
      return;
    }
    const deviceId = required("--device").trim().toUpperCase();
    if (!devicePattern.test(deviceId)) throw Error("Invalid Device ID");
    const now = new Date().toISOString();
    let old: License | undefined, record: RecordEntry | undefined;
    if (command === "reissue") {
      if (
        options["--confirm-transfer"] !== "yes" ||
        !(options["--reason"] || "").trim()
      )
        throw Error("Transfer requires --confirm-transfer and --reason");
      const code = readCode(required("--previous"));
      old = verifyLicense(code, keys);
      record = records.find((item) => item.id === old!.licenseId);
      if (
        !record ||
        record.status !== "issued" ||
        record.codeHash !== createHash("sha256").update(code).digest("hex")
      )
        throw Error(
          "Previous license missing or already superseded in admin ledger",
        );
      if (old.deviceId === deviceId || Date.parse(old.expiresAt) <= Date.now())
        throw Error(
          "Transfer requires a different device and an unexpired license",
        );
    }
    const months = old?.months ?? (Number(required("--months")) as Months);
    const start =
      old?.startsAt ??
      (options["--start"] ? new Date(options["--start"]).toISOString() : now);
    const customer = old?.customer ?? required("--customer").trim();
    const secret = dpapi(fs.readFileSync(privateFile), true);
    let key;
    try {
      key = createPrivateKey({ key: secret, type: "pkcs8", format: "der" });
    } finally {
      secret.fill(0);
    }
    const pub = createPublicKey(key)
      .export({ type: "spki", format: "pem" })
      .toString();
    if (keys[keyId(pub)] !== pub) throw Error("Vault key mismatch");
    const payload: License = {
      v: 1,
      product: "daidar-flow-desktop",
      keyId: keyId(pub),
      licenseId: randomUUID(),
      customer,
      deviceId,
      issuedAt: now,
      startsAt: start,
      expiresAt: old?.expiresAt ?? addMonths(start, months),
      months,
      features:
        old?.features ??
        (options["--features"]
          ? (options["--features"].split(",").sort() as License["features"])
          : [...paidFeatures]),
      replaces: old?.licenseId ?? null,
    };
    const bytes = Buffer.from(canonical(payload));
    const code =
      "DFL1." +
      bytes.toString("base64url") +
      "." +
      sign(null, bytes, key).toString("base64url");
    verifyLicense(code, keys);
    // Ledger is committed first. If output fails, the next issue gets a new ID; no duplicate overwrite.
    if (record) record.status = "superseded";
    records.push({
      id: payload.licenseId,
      deviceId,
      code,
      codeHash: createHash("sha256").update(code).digest("hex"),
      status: "issued",
      replaces: payload.replaces,
      reason: old ? options["--reason"].trim().slice(0, 1000) : null,
      at: now,
    });
    const temporary = ledgerFile + ".tmp";
    fs.writeFileSync(temporary, JSON.stringify(records, null, 2) + "\n", {
      mode: 0o600,
    });
    fs.renameSync(temporary, ledgerFile);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, code + "\n", { flag: "wx", mode: 0o600 });
    console.log(
      `License written: ${out}\nID: ${payload.licenseId}\nExpires: ${payload.expiresAt}`,
    );
  } finally {
    fs.closeSync(fd);
    fs.unlinkSync(lock);
  }
}
try {
  run();
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Administrator operation failed",
  );
  process.exitCode = 1;
}
