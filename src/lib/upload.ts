/**
 * XHR-based PUT with upload-progress events and cancellation.
 *
 * Fetch can't report upload progress in any browser — the `ReadableStream`
 * upload spec is still partial — so for direct Mux uploads (where the byte
 * count matters for UI) we keep using `XMLHttpRequest`.
 *
 * Callers:
 *   - `UploadContext` for reel video uploads (this is the hot path).
 *   - In future: any large signed-URL upload (e.g. user-uploaded music).
 *
 * Contract:
 *   - Resolves with `{ status }` on any 2xx.
 *   - Rejects with `UploadError` on non-2xx, network failure, or abort.
 *   - When `signal` aborts: the in-flight request is cancelled and the
 *     promise rejects with `name === "AbortError"` so callers can branch.
 */

export class UploadError extends Error {
  status: number;
  /** Convenience: true when the rejection was a user cancel via `signal`. */
  aborted: boolean;

  constructor(message: string, status: number, aborted = false) {
    super(message);
    this.name = aborted ? "AbortError" : "UploadError";
    this.status = status;
    this.aborted = aborted;
  }
}

export interface UploadProgress {
  /** 0..1, or `null` while the browser hasn't reported total bytes yet. */
  ratio: number | null;
  loaded: number;
  total: number | null;
}

export interface PutVideoOptions {
  signal?: AbortSignal;
  onProgress?: (progress: UploadProgress) => void;
  /** Defaults to `file.type` or "application/octet-stream" if missing. */
  contentType?: string;
}

export function putVideoWithProgress(
  url: string,
  file: Blob,
  opts: PutVideoOptions = {}
): Promise<{ status: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    const onAbort = () => {
      // The xhr.onabort handler below converts this into a rejected promise;
      // we just need to trigger the abort here. `xhr.abort()` is idempotent
      // so a double-fire (e.g. signal aborts after settlement) is harmless.
      try {
        xhr.abort();
      } catch {
        /* noop */
      }
    };

    if (opts.signal) {
      if (opts.signal.aborted) {
        reject(new UploadError("Upload aborted", 0, true));
        return;
      }
      opts.signal.addEventListener("abort", onAbort, { once: true });
    }

    xhr.open("PUT", url, true);

    const contentType =
      opts.contentType ||
      (file instanceof File && file.type) ||
      "application/octet-stream";
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (e) => {
      if (!opts.onProgress) return;
      opts.onProgress({
        loaded: e.loaded,
        total: e.lengthComputable ? e.total : null,
        ratio: e.lengthComputable && e.total > 0 ? e.loaded / e.total : null,
      });
    };

    xhr.onload = () => {
      // Strip our abort listener so it can't fire after settlement.
      opts.signal?.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        // Emit a final 100% tick so the toast snaps to complete even if the
        // browser dropped the last progress event.
        opts.onProgress?.({
          loaded: file.size,
          total: file.size,
          ratio: 1,
        });
        resolve({ status: xhr.status });
      } else {
        reject(
          new UploadError(
            `Upload failed with HTTP ${xhr.status}`,
            xhr.status,
            false
          )
        );
      }
    };

    xhr.onerror = () => {
      opts.signal?.removeEventListener("abort", onAbort);
      reject(new UploadError("Network error during upload", 0, false));
    };

    xhr.ontimeout = () => {
      opts.signal?.removeEventListener("abort", onAbort);
      reject(new UploadError("Upload timed out", 0, false));
    };

    xhr.onabort = () => {
      opts.signal?.removeEventListener("abort", onAbort);
      reject(new UploadError("Upload aborted", 0, true));
    };

    xhr.send(file);
  });
}
