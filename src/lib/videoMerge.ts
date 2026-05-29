/**
 * Client-side FFmpeg pipeline for baking a background-music track into a
 * user's reel video. Runs the whole thing in the browser via `ffmpeg.wasm`
 * so the merged file can flow through the existing direct-to-Mux upload
 * pipeline unchanged.
 *
 * Design borrowed from the VidForge reference doc, hardened against every
 * §6 bug it called out. Cross-references:
 *
 *  - Bug #1 ("music ends before video"):
 *      • Pre-loop via concat demuxer with `floor(DUR/musicDur)+2` repeats
 *        (never `-stream_loop`)
 *      • Pass B: `apad=whole_dur=DUR` BEFORE `atrim` so encoder
 *        priming/padding can't leave us a few hundred ms short
 *      • Pass C: `-t DUR` on the output
 *      • Mandatory post-mux duration probe; hard-fail with one auto-retry
 *  - Bug #2 (AAC priming drift): every pass re-encodes audio; we never
 *    `-c copy` an audio stream we just trimmed
 *  - Bug #3 (per-segment length mismatch): master `DUR` is
 *    `min(<video>.duration, ffmpeg-stderr-Duration)` — single source of
 *    truth derived from BOTH the browser probe and an FFmpeg reprobe
 *  - Bug #4 (muxed output has timestamp/length oddities): all four flags
 *    on the final mux — `-t`, `-shortest`, `-avoid_negative_ts make_zero`,
 *    `-movflags +faststart`
 *  - Bug #5 (intro silence shifts music start): `asetpts=PTS-STARTPTS`
 *    on every audio branch
 *
 * The worker is a singleton — loaded lazily on first call, kept warm for
 * subsequent merges. `ffmpeg.terminate()` (used for cancellation) destroys
 * it, so we track `alive` and re-load on the next call.
 */
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { track } from "./analytics";

// ---------- Public API ----------------------------------------------------

export type MergeStage =
  | "load"
  | "probe"
  | "musicPrep"
  | "loop"
  | "audio"
  | "mux"
  | "verify";

export interface MergeJob {
  /** The user's raw video, exactly as picked in ComposeReel. */
  video: File;
  /**
   * Container-level duration the caller already probed via `<video>.duration`.
   * We use it as a hint and combine it with an FFmpeg reprobe to pick the
   * actual master `DUR` — see Bug #3 hardening above.
   */
  videoDurationSec: number;
  /** Public HTTPS URL for the picked song (e.g. Firebase Storage). */
  songUrl: string;
  /** Song length in seconds — best-effort, used only for crop defaults. */
  songDurationSec: number;
  /** User-chosen crop start, in seconds, relative to the source song. */
  musicStartSec: number;
  /** User-chosen crop end, in seconds. Must be > start by at least 1s. */
  musicEndSec: number;
  /** UI hook. `frac` is 0..1 within the current stage. */
  onProgress?: (frac: number, stage: MergeStage) => void;
  /**
   * Cancel signal. On abort we call `ffmpeg.terminate()` and throw
   * `MergeAbortError`. Subsequent merges automatically reload the worker.
   */
  signal?: AbortSignal;
}

export class MergeAbortError extends Error {
  constructor() {
    super("Merge aborted");
    this.name = "MergeAbortError";
  }
}

/**
 * Thrown after BOTH the `-c:v copy` and the `-c:v libx264` fallback paths
 * have produced a muxed file whose duration disagrees with the master
 * `DUR` by more than 100 ms. Callers should surface a "post without music"
 * fallback CTA — we never want to ship a silently broken reel.
 */
export class MergeDurationMismatchError extends Error {
  outDur: number;
  targetDur: number;
  constructor(outDur: number, targetDur: number) {
    super(
      `Merged output duration ${outDur.toFixed(3)}s differs from target ${targetDur.toFixed(3)}s by ${Math.abs(outDur - targetDur).toFixed(3)}s`
    );
    this.name = "MergeDurationMismatchError";
    this.outDur = outDur;
    this.targetDur = targetDur;
  }
}

/**
 * Run the full pipeline and return a fresh `File` (MP4, video/mp4) that
 * has the picked + cropped + looped song baked in. The original video's
 * audio is silently dropped — selecting a song always replaces it
 * (matches the product spec).
 *
 * Failure semantics:
 *   - Abort (`signal.abort()`):              throws `MergeAbortError`.
 *   - Output duration off by > 100 ms after libx264 retry:
 *                                            throws `MergeDurationMismatchError`.
 *   - Anything else (load failure, bad input video, OOM, fs error, …):
 *                                            throws a generic Error.
 *
 * On ANY thrown error after the worker has been booted we destroy the
 * worker (`terminate()` + clear `state.alive`) so the next call starts
 * from a clean slate. We also emit `reel_merge_completed` /
 * `reel_merge_failed` analytics events so we can monitor real-world
 * success rates and per-stage failure distribution.
 */
export async function mergeVideoWithMusic(job: MergeJob): Promise<File> {
  const t0 = performance.now();
  // The stage we're CURRENTLY in. Surfaced in failure metrics so we can
  // tell "load failed" from "music prep failed" from "mux failed" without
  // round-tripping to the user's device for a stack trace.
  let stage: MergeStage = "load";
  // Captures whether Pass C needed the libx264 re-encode fallback.
  // Surfaced in metrics so we can monitor codec-fallback rate by cohort.
  let usedLibx264 = false;
  // Will only be assigned once `ensureFfmpeg()` resolves. Allows the
  // catch block to safely no-op the terminate() if load failed before
  // any worker existed.
  let ffmpeg: FFmpeg | null = null;
  let onAbort: (() => void) | null = null;

  throwIfAborted(job.signal);

  try {
    // ---------- load (may throw) -------------------------------------------
    job.onProgress?.(0, "load");
    ffmpeg = await ensureFfmpeg();
    throwIfAborted(job.signal);

    // Each merge starts in a clean virtual FS so we can't be poisoned by
    // leftovers from an aborted previous run.
    await wipeFs(ffmpeg);

    // Wire abort propagation now that we have a live worker to terminate.
    const localFfmpeg = ffmpeg;
    onAbort = () => {
      try {
        localFfmpeg.terminate();
      } catch {
        /* worker may already be gone */
      }
      state.alive = false;
    };
    job.signal?.addEventListener("abort", onAbort, { once: true });

    // ---------- write inputs -----------------------------------------------
    job.onProgress?.(0.2, "load");
    // `fetchFile` accepts File / Blob / URL — same call shape for both
    // inputs avoids a duplicate `arrayBuffer()` heap allocation.
    const videoBytes = await fetchFile(job.video);
    await ffmpeg.writeFile("user_video.mp4", videoBytes);
    throwIfAborted(job.signal);

    job.onProgress?.(0.6, "load");
    const musicBytes = await fetchFile(job.songUrl);
    await ffmpeg.writeFile("music_temp", musicBytes);
    throwIfAborted(job.signal);

    // ---------- master DUR ---------------------------------------------------
    stage = "probe";
    job.onProgress?.(0, "probe");
    const probedVideoDur = await probeDurationSec(ffmpeg, "user_video.mp4");
    // Pick the SMALLER of (caller, ffmpeg) so we never build audio longer
    // than the actual video stream. Floor to ms precision so float drift
    // doesn't accumulate across passes.
    const masterDur = floorMs(
      Math.max(
        0.1,
        Math.min(
          probedVideoDur || job.videoDurationSec,
          job.videoDurationSec || probedVideoDur
        )
      )
    );
    if (masterDur <= 0 || !Number.isFinite(masterDur)) {
      throw new Error(
        `Could not determine a valid video duration (probed=${probedVideoDur}, caller=${job.videoDurationSec})`
      );
    }

    // ---------- Pass A: music crop + normalize ------------------------------
    stage = "musicPrep";
    job.onProgress?.(0, "musicPrep");
    // Clamp negative / non-finite user-supplied trim values defensively.
    // The trimmer already clamps in the UI, but `mergeVideoWithMusic` is
    // also a public function and we don't want a 0-byte crop to crash
    // ffmpeg on a malformed call site.
    const safeStart = Math.max(
      0,
      Number.isFinite(job.musicStartSec) ? job.musicStartSec : 0
    );
    const safeEnd = Math.max(
      safeStart + 0.05,
      Number.isFinite(job.musicEndSec) ? job.musicEndSec : safeStart + 0.05
    );
    const wantCrop = safeEnd > safeStart + 0.05;
    const cropArgs = wantCrop
      ? ["-ss", String(safeStart), "-t", String(safeEnd - safeStart)]
      : [];
    await exec(ffmpeg, [
      "-i", "music_temp",
      ...cropArgs,
      "-vn",
      "-c:a", "libmp3lame",
      "-b:a", "192k",
      "-y", "music.mp3",
    ]);
    await safeDelete(ffmpeg, "music_temp");
    throwIfAborted(job.signal);

    // ---------- Loop the music (if shorter than DUR + 5s) -------------------
    stage = "loop";
    job.onProgress?.(0, "loop");
    const musicDur = await probeDurationSec(ffmpeg, "music.mp3");
    if (musicDur < masterDur + 5) {
      // Bug #1 fix: NEVER `-stream_loop`. Use the concat demuxer with
      // generous +2 safety repeats; cap with `-t DUR+10` so we don't bloat
      // a 12s video into a 30-minute looped track.
      const repeats = Math.floor(masterDur / Math.max(0.1, musicDur)) + 2;
      const listLines: string[] = [];
      for (let i = 0; i < repeats; i++) listLines.push("file 'music.mp3'");
      await ffmpeg.writeFile(
        "music_loop_list.txt",
        new TextEncoder().encode(listLines.join("\n") + "\n")
      );
      await exec(ffmpeg, [
        "-f", "concat",
        "-safe", "0",
        "-i", "music_loop_list.txt",
        "-t", String(masterDur + 10),
        "-c:a", "libmp3lame",
        "-b:a", "192k",
        "-y", "music_looped.mp3",
      ]);
      await safeDelete(ffmpeg, "music_loop_list.txt");
    } else {
      // Already long enough — straight copy. Bug #2 doesn't apply here
      // because Pass B re-encodes to AAC anyway (no priming-gap accumulation).
      await exec(ffmpeg, ["-i", "music.mp3", "-c", "copy", "-y", "music_looped.mp3"]);
    }
    await safeDelete(ffmpeg, "music.mp3");
    throwIfAborted(job.signal);

    // ---------- Pass B: final audio at EXACTLY masterDur seconds -----------
    // Filter order matters:
    //   apad   — pad with silence so atrim has enough material (Bug #1)
    //   atrim  — hard cut at masterDur seconds
    //   asetpts— rebase to 0 so muxer doesn't see negative starts (Bug #5)
    //   volume — 0.9 not 1.0 to avoid clip on AAC re-encode
    stage = "audio";
    job.onProgress?.(0, "audio");
    const durStr = masterDur.toFixed(3);
    await exec(ffmpeg, [
      "-i", "music_looped.mp3",
      "-af",
      `apad=whole_dur=${durStr},atrim=duration=${durStr},asetpts=PTS-STARTPTS,volume=0.9`,
      "-t", durStr,
      "-c:a", "aac",
      "-b:a", "192k",
      "-ar", "48000",
      "-y", "final_audio.m4a",
    ]);
    await safeDelete(ffmpeg, "music_looped.mp3");
    throwIfAborted(job.signal);

    // ---------- Pass C: mux video stream + final audio ---------------------
    // `-map 0:v` (NO `-map 0:a`) is how we mute the original video audio.
    // All four Bug #4 flags present on the output.
    stage = "mux";
    job.onProgress?.(0, "mux");
    const muxedOk = await tryMux(ffmpeg, durStr, /* useLibx264 */ false);
    if (!muxedOk) {
      // Container/codec wasn't stream-copy-friendly (HEVC, VP9, weird
      // VP8 in MP4, etc). Fall back to a libx264 re-encode. -r 30 is the
      // VFR-safety belt the reference plan uses on its concat path.
      await safeDelete(ffmpeg, "final_output.mp4");
      usedLibx264 = true;
      const reencodedOk = await tryMux(ffmpeg, durStr, /* useLibx264 */ true);
      if (!reencodedOk) {
        throw new Error("Both stream-copy and libx264 mux passes failed");
      }
    }
    throwIfAborted(job.signal);

    // ---------- Mandatory post-mux verification ----------------------------
    stage = "verify";
    job.onProgress?.(0, "verify");
    const outDur = await probeDurationSec(ffmpeg, "final_output.mp4");
    if (Math.abs(outDur - masterDur) > 0.1) {
      // Retry the mux once via libx264 in case we used `-c:v copy` first.
      // If that ALSO fails the duration check, give up loud — never ship.
      await safeDelete(ffmpeg, "final_output.mp4");
      usedLibx264 = true;
      const retried = await tryMux(ffmpeg, durStr, /* useLibx264 */ true);
      if (retried) {
        const retryDur = await probeDurationSec(ffmpeg, "final_output.mp4");
        if (Math.abs(retryDur - masterDur) > 0.1) {
          throw new MergeDurationMismatchError(retryDur, masterDur);
        }
      } else {
        throw new MergeDurationMismatchError(outDur, masterDur);
      }
    }

    // ---------- Hand back as a File ----------------------------------------
    // ffmpeg.readFile returns Uint8Array unless the second arg is "utf8",
    // which we never pass — narrow with an assertion rather than a
    // dead-branch fallback that would produce garbled bytes if hit.
    const out = (await ffmpeg.readFile("final_output.mp4")) as Uint8Array;
    const base = stripExtension(job.video.name) || "reel";
    const result = new File([new Uint8Array(out)], `${base}-music.mp4`, {
      type: "video/mp4",
    });

    track("reel_merge_completed", {
      durMs: Math.round(performance.now() - t0),
      masterDurSec: masterDur,
      usedLibx264,
      crossOriginIsolated:
        typeof window !== "undefined" && window.crossOriginIsolated,
      videoBytes: job.video.size,
      outBytes: result.size,
    });
    return result;
  } catch (err) {
    const aborted = job.signal?.aborted === true;
    track("reel_merge_failed", {
      durMs: Math.round(performance.now() - t0),
      stage,
      usedLibx264,
      aborted,
      reason: aborted
        ? "abort"
        : err instanceof MergeDurationMismatchError
        ? "duration_mismatch"
        : err instanceof Error
        ? err.name
        : "unknown",
      message: err instanceof Error ? err.message.slice(0, 200) : null,
    });

    // If the worker booted before we threw, destroy it so the next merge
    // starts from a clean slate. Guarded on `ffmpeg` so a load failure
    // (where `ffmpeg` is still null) doesn't double-throw on `.terminate()`.
    if (ffmpeg) {
      try {
        ffmpeg.terminate();
      } catch {
        /* worker already gone */
      }
      state.alive = false;
    }

    if (aborted) throw new MergeAbortError();
    throw err;
  } finally {
    if (onAbort) job.signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * Warm the singleton worker without running a merge. Call this from
 * ComposeReel when the user has both a video and a song queued so the
 * ~30 MB WASM download happens during their crop tweak, not after they
 * tap Post.
 */
export async function preloadFfmpeg(): Promise<void> {
  await ensureFfmpeg();
}

// ---------- Singleton lifecycle ------------------------------------------

interface SingletonState {
  ffmpeg: FFmpeg | null;
  loading: Promise<FFmpeg> | null;
  alive: boolean;
}

const state: SingletonState = { ffmpeg: null, loading: null, alive: false };

async function ensureFfmpeg(): Promise<FFmpeg> {
  if (state.ffmpeg && state.alive) return state.ffmpeg;
  if (state.loading) return state.loading;

  // CRITICAL: clear `state.loading` BOTH on success and on failure (via
  // `finally`). The old structure assigned `state.loading = null` only
  // after `ffmpeg.load()` resolved — so a rejected load left a permanently
  // rejected promise in `state.loading` and every subsequent merge call
  // saw the same rejection forever, forcing a tab reload to recover.
  state.loading = (async () => {
    try {
      const ffmpeg = new FFmpeg();
      // Pipe ffmpeg's stderr into a buffer so probeDurationSec() can parse
      // the "Duration:" lines without us needing a real ffprobe binary.
      ffmpeg.on("log", ({ message }) => {
        logBuffer.push(message);
        // Trim the log buffer so it can't grow without bound on long sessions.
        if (logBuffer.length > 5000) logBuffer.splice(0, 2000);
      });

      const useMt =
        typeof window !== "undefined" && window.crossOriginIsolated;
      const base = useMt ? "/ffmpeg/mt" : "/ffmpeg/st";
      const loadConfig: {
        coreURL: string;
        wasmURL: string;
        workerURL?: string;
      } = {
        coreURL: `${base}/ffmpeg-core.js`,
        wasmURL: `${base}/ffmpeg-core.wasm`,
      };
      if (useMt) loadConfig.workerURL = `${base}/ffmpeg-core.worker.js`;

      await ffmpeg.load(loadConfig);
      state.ffmpeg = ffmpeg;
      state.alive = true;
      return ffmpeg;
    } finally {
      // Always clear so the next caller retries on failure / reuses the
      // populated `state.ffmpeg` on success.
      state.loading = null;
    }
  })();

  return state.loading;
}

async function wipeFs(ffmpeg: FFmpeg): Promise<void> {
  // ffmpeg.wasm doesn't expose a "wipe everything" API, so unlink the
  // known temp files individually. Missing files throw — swallow those.
  for (const f of [
    "user_video.mp4",
    "music_temp",
    "music.mp3",
    "music_looped.mp3",
    "music_loop_list.txt",
    "final_audio.m4a",
    "final_output.mp4",
  ]) {
    await safeDelete(ffmpeg, f);
  }
}

async function safeDelete(ffmpeg: FFmpeg, path: string): Promise<void> {
  try {
    await ffmpeg.deleteFile(path);
  } catch {
    /* didn't exist */
  }
}

// ---------- exec + probe helpers -----------------------------------------

const logBuffer: string[] = [];

async function exec(ffmpeg: FFmpeg, args: string[]): Promise<number> {
  // Truncate the log buffer per-exec so probeDurationSec only sees the
  // current invocation's lines.
  logBuffer.length = 0;
  const code = await ffmpeg.exec(args);
  if (code !== 0) {
    const tail = logBuffer.slice(-20).join("\n");
    throw new Error(`ffmpeg exited ${code}\n${tail}`);
  }
  return code;
}

async function tryMux(
  ffmpeg: FFmpeg,
  durStr: string,
  useLibx264: boolean
): Promise<boolean> {
  const videoArgs = useLibx264
    ? [
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "28",
        "-pix_fmt", "yuv420p",
        "-r", "30",
      ]
    : ["-c:v", "copy"];
  try {
    await exec(ffmpeg, [
      "-i", "user_video.mp4",
      "-i", "final_audio.m4a",
      "-map", "0:v",
      "-map", "1:a",
      "-t", durStr,
      ...videoArgs,
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      "-avoid_negative_ts", "make_zero",
      "-movflags", "+faststart",
      "-y", "final_output.mp4",
    ]);
    return true;
  } catch (err) {
    console.warn("[videoMerge] mux pass failed", { useLibx264, err });
    return false;
  }
}

/**
 * Parse the "Duration: HH:MM:SS.MS" line that FFmpeg always prints to
 * stderr when invoked with `-i <file>`. We get this for free from the
 * log listener; calling `ffmpeg.exec(["-i", path])` returns non-zero
 * (no output specified) but still emits the metadata line.
 */
async function probeDurationSec(ffmpeg: FFmpeg, path: string): Promise<number> {
  logBuffer.length = 0;
  try {
    await ffmpeg.exec(["-i", path, "-hide_banner"]);
  } catch {
    // `-i` with no output is expected to exit non-zero. We only care
    // about the stderr metadata, which the log listener already captured.
  }
  const joined = logBuffer.join("\n");
  const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i.exec(joined);
  if (!match) return 0;
  const hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const secs = parseFloat(match[3]);
  return hours * 3600 + mins * 60 + secs;
}

// ---------- misc helpers --------------------------------------------------

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new MergeAbortError();
}

function floorMs(sec: number): number {
  return Math.floor(sec * 1000) / 1000;
}

function stripExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}
