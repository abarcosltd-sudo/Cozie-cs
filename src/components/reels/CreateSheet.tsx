/**
 * Bottom sheet shown when the user taps the center "+" in the BottomNav.
 *
 * Single decision surface: do you want to share music or create a reel?
 * Both options jump to their respective compose flow. We deliberately don't
 * try to be clever about defaults — the spec wants the choice explicit.
 */
import { Music, Upload, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Modal } from "../ui/Modal";
import styles from "./CreateSheet.module.css";

interface CreateSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Center-tab "+" bottom sheet. Listeners see two options (share existing
 * catalog song + reel); artists see a third "Upload track" option that
 * lands on /add-music, which is the upload-first path into their bubble.
 *
 * The split exists because "share music" and "upload music" are two
 * different intents:
 *   - share-music = pick an existing catalog song + caption → musicPost
 *   - add-music   = upload a brand-new audio file + metadata → music doc,
 *                   then for artists auto-creates a bubble post for it.
 */
export function CreateSheet({ open, onClose }: CreateSheetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isArtist = user?.userType === "artist";

  const go = (path: string) => {
    onClose();
    // Defer navigation until the sheet's close animation has a chance to
    // start; otherwise the new screen mounts under an open modal which
    // makes the back-button feel jumpy.
    setTimeout(() => navigate(path), 50);
  };

  return (
    <Modal open={open} title="Create" onClose={onClose} size="sm">
      <ul className={styles.list}>
        {isArtist ? (
          <li>
            <button
              type="button"
              className={styles.row}
              onClick={() => go("/add-music")}
            >
              <span className={styles.iconWrap}>
                <Upload size={22} aria-hidden />
              </span>
              <span className={styles.meta}>
                <span className={styles.title}>Upload track to your bubble</span>
                <span className={styles.desc}>
                  Drop a new song straight into your bubble. Release publicly
                  whenever you're ready.
                </span>
              </span>
            </button>
          </li>
        ) : null}
        <li>
          <button
            type="button"
            className={styles.row}
            onClick={() => go("/share-music")}
          >
            <span className={styles.iconWrap}>
              <Music size={22} aria-hidden />
            </span>
            <span className={styles.meta}>
              <span className={styles.title}>
                {isArtist ? "Share an existing song" : "Share music"}
              </span>
              <span className={styles.desc}>
                Post an existing catalog song to your feed with a caption.
              </span>
            </span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className={styles.row}
            onClick={() => go("/compose/reel")}
          >
            <span className={styles.iconWrap}>
              <Video size={22} aria-hidden />
            </span>
            <span className={styles.meta}>
              <span className={styles.title}>New reel</span>
              <span className={styles.desc}>
                Upload a short vertical clip. Up to 60 s.
              </span>
            </span>
          </button>
        </li>
      </ul>
    </Modal>
  );
}
