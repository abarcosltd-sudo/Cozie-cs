import { Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import authStyles from "./_authShared.module.css";
import styles from "./splash.module.css";

const FEATURES: { icon: string; text: string }[] = [
  { icon: "🎵", text: "Discover and share music with your circle" },
  { icon: "💜", text: "Connect through the songs you love" },
  { icon: "🎧", text: "Build playlists together in real-time" },
];

export default function Splash() {
  const navigate = useNavigate();
  return (
    <div className={authStyles.page}>
      <div className={styles.shapes} aria-hidden>
        <span className={styles.shape} />
        <span className={styles.shape} />
        <span className={styles.shape} />
      </div>

      <div className={authStyles.container}>
        <div className={authStyles.logoSection}>
          <div className={authStyles.logoMark}>
            <Music size={32} aria-hidden />
          </div>
          <h1 className={authStyles.appName}>COZIE</h1>
          <p className={authStyles.tagline}>Share your music vibe with friends</p>
        </div>

        <ul className={styles.features}>
          {FEATURES.map((f) => (
            <li key={f.text} className={styles.feature}>
              <span className={styles.featureIcon} aria-hidden>
                {f.icon}
              </span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => navigate("/login")}
        >
          Get Started
        </Button>

        <div className={authStyles.footer}>
          By continuing, you agree to Cozie's{" "}
          <a href="/terms">Terms of Service</a> and{" "}
          <a href="/privacy">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
}
