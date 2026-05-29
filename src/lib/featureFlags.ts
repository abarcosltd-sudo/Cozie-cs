/**
 * Compile-time feature flags driven by `VITE_*` env vars baked into the
 * bundle at build time. Each flag has a typed reader so callers don't have
 * to reach into `import.meta.env` (which would force them to handle
 * `string | undefined | "true" | "false"` ad hoc).
 *
 * Flags here are NOT user-targeted A/B switches — they're operational
 * kill switches we can flip in env to disable an entire surface without
 * shipping a code revert. For per-user gating use the analytics provider.
 */

function readBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === "") return fallback;
  return raw.toLowerCase() !== "false" && raw !== "0";
}

/**
 * Music-merge for reels (client-side ffmpeg.wasm pipeline).
 * Defaults to enabled. Set `VITE_ENABLE_MUSIC_MERGE=false` to disable.
 */
export const ENABLE_MUSIC_MERGE = readBool(
  import.meta.env.VITE_ENABLE_MUSIC_MERGE,
  true
);
