/**
 * Postinstall: copy ffmpeg.wasm core blobs out of node_modules and into
 * `public/ffmpeg/{st,mt}/` so Vite serves them from our own origin.
 *
 * Why self-host:
 *   - COOP/COEP `require-corp` blocks cross-origin WASM. By serving the
 *     core from the same origin as the app, we never trip that.
 *   - SAB / multi-thread also requires the worker script to be same-origin.
 *
 * Why not check the binaries into git:
 *   - ~32 MB each; they regenerate deterministically from npm.
 *   - `public/ffmpeg/` is in .gitignore.
 *
 * Idempotent: runs on every `npm install`. Skips files that are byte-
 * identical so it's also fast on warm trees.
 */
import { existsSync, mkdirSync, copyFileSync, statSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// IMPORTANT: copy from `dist/esm/`, not `dist/umd/`.
//
// @ffmpeg/ffmpeg@0.12 hardcodes `new Worker(url, { type: "module" })` for the
// engine worker. In a module worker, `self.importScripts()` throws, so the
// engine worker's LOAD handler falls through to `await import(coreURL).default`.
// That dynamic-import path only resolves to the `createFFmpegCore` factory if
// the served core JS is a proper ES module with `export default` — which the
// UMD build is NOT (it's a self-executing UMD shim with no exports). Serving
// UMD produces the silent "failed to import ffmpeg-core.js" reject we saw in
// production.
//
// The .wasm payload is byte-identical between umd/ and esm/; only the JS
// wrapper differs. The .worker.js (MT only) must match its sibling JS, so we
// take all three from the ESM dir.
const SOURCES = [
  {
    label: "single-thread",
    from: join(ROOT, "node_modules", "@ffmpeg", "core", "dist", "esm"),
    to: join(ROOT, "public", "ffmpeg", "st"),
    files: ["ffmpeg-core.js", "ffmpeg-core.wasm"],
  },
  {
    label: "multi-thread",
    from: join(ROOT, "node_modules", "@ffmpeg", "core-mt", "dist", "esm"),
    to: join(ROOT, "public", "ffmpeg", "mt"),
    files: ["ffmpeg-core.js", "ffmpeg-core.wasm", "ffmpeg-core.worker.js"],
  },
];

function copyIfChanged(src, dst) {
  if (!existsSync(src)) {
    console.warn(`[copy-ffmpeg-core] missing source: ${src} — skipping`);
    return false;
  }
  if (existsSync(dst)) {
    const a = statSync(src);
    const b = statSync(dst);
    if (a.size === b.size && a.mtimeMs <= b.mtimeMs) return false;
  }
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  return true;
}

let copied = 0;
let skipped = 0;
for (const group of SOURCES) {
  // Ensure source dir actually exists (handles the case where one of the
  // optional cores wasn't installed in this environment).
  if (!existsSync(group.from)) {
    console.warn(
      `[copy-ffmpeg-core] ${group.label}: source dir missing (${group.from}). Did npm install fail?`
    );
    continue;
  }
  for (const f of group.files) {
    if (copyIfChanged(join(group.from, f), join(group.to, f))) copied += 1;
    else skipped += 1;
  }
}

console.log(
  `[copy-ffmpeg-core] copied=${copied} skipped=${skipped} (st=${readdirSync(join(ROOT, "public", "ffmpeg", "st"), { withFileTypes: false }).join(",")}, mt=${readdirSync(join(ROOT, "public", "ffmpeg", "mt"), { withFileTypes: false }).join(",")})`
);
