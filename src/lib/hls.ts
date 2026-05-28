/**
 * Tiny HLS attachment helper used by `<ReelPlayer>`.
 *
 * Safari (desktop + iOS) plays HLS natively via `<video src="...m3u8">`, so we
 * skip the JS shim there. Chrome / Firefox / Edge need `hls.js` to demux the
 * playlist and segments into MSE buffers.
 *
 * Caller owns the `HTMLVideoElement`; `attach()` returns a `detach()` to call
 * on unmount (cancels in-flight segment fetches, frees buffers).
 *
 * `hls.js` is loaded statically — it's already in the bundle for the Reels
 * route and we want playback ready on first frame, not after a dynamic import.
 */
import Hls from "hls.js";

export interface AttachOptions {
  /**
   * Lower-buffer profile suitable for the Reels feed: we keep memory low and
   * defer back-buffer release so swipe-back replays don't re-fetch segments.
   * Defaults are sensible for short vertical clips (60s max).
   */
  lowLatency?: boolean;
}

export interface HlsHandle {
  detach: () => void;
  /** True when this element is using native HLS (Safari) vs the JS shim. */
  native: boolean;
}

function canPlayNativeHls(video: HTMLVideoElement): boolean {
  // Safari / iOS / older Edge expose HLS via the `vnd.apple.mpegurl` MIME.
  // `canPlayType` returns "" | "maybe" | "probably"; anything non-empty means
  // the browser will hand the playlist directly to the media element.
  return Boolean(video.canPlayType("application/vnd.apple.mpegurl"));
}

export function attach(
  video: HTMLVideoElement,
  src: string,
  opts: AttachOptions = {}
): HlsHandle {
  if (canPlayNativeHls(video)) {
    // Native path. Just set src and let the platform handle it.
    video.src = src;
    return {
      native: true,
      detach: () => {
        try {
          video.removeAttribute("src");
          video.load(); // releases the media source on Safari
        } catch {
          /* element may already be gone */
        }
      },
    };
  }

  if (!Hls.isSupported()) {
    // No HLS support at all (very old Firefox). Fall back to setting src
    // and hoping the browser surfaces an error — the player UI will then
    // show the poster + error state.
    video.src = src;
    return {
      native: false,
      detach: () => {
        try {
          video.removeAttribute("src");
          video.load();
        } catch {
          /* noop */
        }
      },
    };
  }

  const hls = new Hls({
    enableWorker: true,
    lowLatencyMode: Boolean(opts.lowLatency),
    // Reels are <= 60s. A 30s max buffer covers the whole clip plus headroom
    // without ballooning memory on mid-tier devices.
    maxBufferLength: 30,
    maxMaxBufferLength: 60,
    backBufferLength: 10,
    // Start playback as soon as the first fragment is ready instead of
    // waiting for the player to think the network can sustain ABR.
    startFragPrefetch: true,
  });

  hls.loadSource(src);
  hls.attachMedia(video);

  return {
    native: false,
    detach: () => {
      try {
        hls.destroy();
      } catch {
        /* idempotent — Hls handles double-destroy */
      }
    },
  };
}
