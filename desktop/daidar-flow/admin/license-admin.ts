// Administrator CLI; UI and CLI share the same signing service.
import { executeAdmin } from "./service";
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

try {
  const result = executeAdmin(command || "", options);
  console.log(result.message);
  if (result.path) console.log(result.path);
  if (result.license) console.log(JSON.stringify(result.license, null, 2));
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Administrator operation failed",
  );
  process.exitCode = 1;
}
