import { build } from "vite";
import { build as bundle } from "esbuild";
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
