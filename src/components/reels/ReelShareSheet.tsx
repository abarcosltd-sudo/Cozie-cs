/**
 * Share sheet for a single reel.
 *
 * Surfaces two share targets per the F3 scope:
 *   - Web Share API (when available) — invokes the OS share sheet so users
 *     can pick any installed app (iMessage, WhatsApp, etc.).
 *   - Copy link — clipboard fallback that always works.
 *
 * The plan's open-decision #2 calls out that we omit the "Share to DM" row
 * until the DM picker UI exists as a standalone component (follow-up).
 *
 * Each row records the share via `useShareReel` *before* performing the
 * action so the count is incremented even if the Web Share modal is
 * dismissed before the user picks a target (matches Instagram's behaviour).
 */
import { useState } from "react";
import { Copy, Share2, Check } from "lucide-react";
import { Modal } from "../ui/Modal";
import { useShareReel } from "../../hooks/useReels";
import type { Reel } from "../../types/api";
import styles from "./ReelShareSheet.module.css";

interface ReelShareSheetProps {
  reel: Reel | null;
  onClose: () => void;
}

function buildReelUrl(reelId: string): string {
  if (typeof window === "undefined") return `/reels/${reelId}`;
  return `${window.location.origin}/reels/${reelId}`;
}

/**
 * Returns the platform's `navigator.share` when present, or null. `Navigator`
 * already declares `share` as optional in the lib.dom types, so we don't
 * need to augment the interface — we just narrow with a runtime check.
 */
function getNativeShare():
  | ((data: ShareData) => Promise<void>)
  | null {
  if (typeof navigator === "undefined") return null;
  const share = (navigator as Navigator & { share?: Navigator["share"] }).share;
  return typeof share === "function" ? share.bind(navigator) : null;
}

export function ReelShareSheet({ reel, onClose }: ReelShareSheetProps) {
  const share = useShareReel(reel?.id ?? "");
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  if (!reel) return null;
  const url = buildReelUrl(reel.id);
  const nativeShare = getNativeShare();
  const canNativeShare = nativeShare !== null;

  const onNativeShare = async () => {
    if (!nativeShare) return;
    setShareError(null);
    // Optimistic count bump regardless of whether the user follows through.
    share.mutate({ platforms: ["native_share"] });
    try {
      await nativeShare({
        title: reel.caption || "Reel on Cozie",
        text: reel.caption || undefined,
        url,
      });
      onClose();
    } catch (err) {
      // AbortError = user dismissed; not an error worth surfacing.
      if (err instanceof Error && err.name === "AbortError") return;
      setShareError("Couldn't open the share sheet.");
    }
  };

  const onCopy = async () => {
    setShareError(null);
    share.mutate({ platforms: ["copy_link"] });
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Legacy fallback. document.execCommand("copy") is deprecated but
        // remains the only path on some browsers that gate the async API.
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } finally {
          document.body.removeChild(ta);
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setShareError("Couldn't copy the link.");
    }
  };

  return (
    <Modal open={!!reel} title="Share reel" onClose={onClose} size="sm">
      <ul className={styles.list}>
        {canNativeShare ? (
          <li>
            <button
              type="button"
              className={styles.row}
              onClick={onNativeShare}
            >
              <span className={styles.iconWrap}>
                <Share2 size={20} aria-hidden />
              </span>
              <span className={styles.label}>Share via…</span>
            </button>
          </li>
        ) : null}
        <li>
          <button type="button" className={styles.row} onClick={onCopy}>
            <span className={styles.iconWrap}>
              {copied ? (
                <Check size={20} aria-hidden />
              ) : (
                <Copy size={20} aria-hidden />
              )}
            </span>
            <span className={styles.label}>
              {copied ? "Link copied" : "Copy link"}
            </span>
          </button>
        </li>
      </ul>
      {shareError ? <p className={styles.error}>{shareError}</p> : null}
    </Modal>
  );
}
