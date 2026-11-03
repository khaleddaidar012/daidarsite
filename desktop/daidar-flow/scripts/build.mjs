import { build } from "vite";
import { build as bundle } from "esbuild";
import path from "node:path";
await bundle({
  entryPoints: ["src/main/inventory/store.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "dist/inventory-store.cjs",
});
await build({
  root: process.cwd(),
  base: "./",
  css: { postcss: { plugins: [] } },
  build: { outDir: "dist/renderer", emptyOutDir: true },
});
await bundle({
  entryPoints: ["src/main/main.ts", "src/main/preload.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outdir: "dist",
  outExtension: { ".js": ".cjs" },
  external: ["electron"],
  define: { 'process.env.DAIDAR_ECOSYSTEM_ORIGIN': JSON.stringify(process.env.DAIDAR_ECOSYSTEM_ORIGIN || 'https://daidarsoluations.com') },
});
await bundle({
  entryPoints: ["src/shared/features.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "dist/policy.cjs",
});
await bundle({
  entryPoints: ["src/shared/brand.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "dist/brand-policy.cjs",
});
await bundle({
  entryPoints: ["src/main/licensing/protocol.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "dist/license-protocol.cjs",
});
await bundle({
  entryPoints: ["src/main/licensing/device.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "dist/device.cjs",
});
await bundle({
  entryPoints: ["admin/license-admin.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "admin-dist/license-admin.cjs",
});
await bundle({
  entryPoints: ["src/main/licensing/service.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "dist/license-service.cjs",
});
await build({
  root: "admin/ui",
  base: "./",
  publicDir: path.resolve("public"),
  css: { postcss: { plugins: [] } },
  build: { outDir: path.resolve("admin-dist/gui/renderer"), emptyOutDir: true },
});
await bundle({
  entryPoints: ["admin/ui/main.ts", "admin/ui/preload.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outdir: "admin-dist/gui",
  outExtension: { ".js": ".cjs" },
  external: ["electron"],
});
