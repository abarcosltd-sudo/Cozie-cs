import { useNavigate } from "react-router-dom";
import { Music } from "lucide-react";
import { Button } from "../components/ui/Button";
import authStyles from "./_authShared.module.css";
import styles from "./ConnectMusic.module.css";

/**
 * OAuth flows (Spotify / Apple / SoundCloud) are not yet implemented on the
 * backend. The previous version of this page simulated success with a
 * setTimeout and lied to the user — we now show a real "coming soon" state
 * and let the user move on cleanly.
 *
 * When real OAuth lands:
 *   - replace each button's onClick with `window.location.href =
 *     ${apiBaseUrl}/api/auth/${provider}/start` (or similar)
 *   - delete the `disabled` flag.
 */
const SERVICES: { id: string; name: string; color: string }[] = [
  { id: "spotify", name: "Spotify", color: "#1DB954" },
  { id: "apple", name: "Apple Music", color: "#fa233b" },
  { id: "soundcloud", name: "SoundCloud", color: "#ff5500" },
];

export default function ConnectMusic() {
  const navigate = useNavigate();

  return (
    <div className={authStyles.page}>
      <div className={authStyles.container}>
        <div className={authStyles.logoSection}>
          <div className={authStyles.logoMark}>
            <Music size={32} aria-hidden />
          </div>
          <h1 className={authStyles.appName}>COZIE</h1>
        </div>

        <div className={styles.intro}>
          <h2 className={styles.heading}>Connect your music</h2>
          <p className={styles.subtitle}>
            Link a streaming service to share what you're listening to. This
            integration is coming soon — for now you can continue and connect
            later from settings.
          </p>
        </div>

        <ul className={styles.serviceList}>
          {SERVICES.map((s) => (
            <li key={s.id}>
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                disabled
                style={{
                  borderColor: `${s.color}55`,
                }}
                aria-label={`${s.name} — coming soon`}
              >
                Connect {s.name}
                <span className={styles.soonBadge}>Soon</span>
              </Button>
            </li>
          ))}
        </ul>

        <div className={authStyles.footer}>
          <Button
            variant="primary"
            fullWidth
            onClick={() => navigate("/home-feed", { replace: true })}
          >
            Continue to Cozie
          </Button>
        </div>
      </div>
    </div>
  );
}
