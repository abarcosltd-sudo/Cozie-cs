/**
 * Bottom sheet shown when the user taps the center "+" in the BottomNav.
 *
 * Single decision surface: do you want to share music or create a reel?
 * Both options jump to their respective compose flow. We deliberately don't
 * try to be clever about defaults — the spec wants the choice explicit.
 */
import { Music, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../ui/Modal";
import styles from "./CreateSheet.module.css";

interface CreateSheetProps {
  open: boolean;
  onClose: () => void;
}

export function CreateSheet({ open, onClose }: CreateSheetProps) {
  const navigate = useNavigate();

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
              <span className={styles.title}>Share music</span>
              <span className={styles.desc}>
                Post a song to your feed with a caption.
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
