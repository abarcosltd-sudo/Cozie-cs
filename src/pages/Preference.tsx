import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Music, Sparkles } from "lucide-react";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { api, ApiError } from "../lib/api";
import authStyles from "./_authShared.module.css";
import styles from "./Preference.module.css";

const GENRES = [
  { id: "rock", name: "Rock", emoji: "🎸" },
  { id: "pop", name: "Pop", emoji: "🎤" },
  { id: "hip-hop", name: "Hip Hop", emoji: "🎧" },
  { id: "electronic", name: "Electronic", emoji: "🎹" },
  { id: "jazz", name: "Jazz", emoji: "🎺" },
  { id: "classical", name: "Classical", emoji: "🎻" },
  { id: "country", name: "Country", emoji: "🪕" },
  { id: "rnb", name: "R&B/Soul", emoji: "🥁" },
  { id: "reggae", name: "Reggae", emoji: "🎶" },
  { id: "latin", name: "Latin", emoji: "💃" },
  { id: "indie", name: "Indie", emoji: "🎙️" },
  { id: "metal", name: "Metal", emoji: "🤘" },
  { id: "blues", name: "Blues", emoji: "🎸" },
  { id: "folk", name: "Folk", emoji: "🪈" },
  { id: "kpop", name: "K-Pop", emoji: "🎤" },
  { id: "afrobeats", name: "Afrobeats", emoji: "🪘" },
];

const MIN_SELECTIONS = 3;

export default function Preference() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    if (selected.size < MIN_SELECTIONS) {
      setError(`Pick at least ${MIN_SELECTIONS} genres so we can tailor your feed.`);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/users/preferences", {
        genres: Array.from(selected),
      });
      navigate("/profile-setup");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to save preferences"
      );
    } finally {
      setLoading(false);
    }
  };

  const skip = () => navigate("/profile-setup");

  return (
    <div className={authStyles.page}>
      <div className={`${authStyles.container} ${styles.container}`}>
        <div className={authStyles.logoSection}>
          <div className={authStyles.logoMark}>
            <Music size={32} aria-hidden />
          </div>
          <h1 className={authStyles.appName}>COZIE</h1>
        </div>
        <div className={styles.heading}>
          <h2>What music do you vibe with?</h2>
          <p>Select your favorite genres to personalize your feed.</p>
          <span
            className={`${styles.count} ${
              selected.size >= MIN_SELECTIONS ? styles.countOk : ""
            }`}
            aria-live="polite"
          >
            {selected.size >= MIN_SELECTIONS
              ? `${selected.size} selected`
              : `${selected.size} of ${MIN_SELECTIONS}+ selected`}
          </span>
        </div>

        <div className={styles.banner}>
          <Sparkles size={18} aria-hidden className={styles.bannerIcon} />
          <span>
            Choose at least {MIN_SELECTIONS} genres — it helps us recommend music
            and find you friends with similar taste.
          </span>
        </div>

        {error ? <ErrorBox variant="inline" message={error} /> : null}

        <div className={styles.grid} role="group" aria-label="Genre options">
          {GENRES.map((g) => {
            const active = selected.has(g.id);
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={active}
                className={`${styles.card} ${active ? styles.cardActive : ""}`}
                onClick={() => toggle(g.id)}
              >
                <span className={styles.cardEmoji} aria-hidden>
                  {g.emoji}
                </span>
                <span className={styles.cardName}>{g.name}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={skip} disabled={loading}>
            Skip for now
          </Button>
          <Button
            variant="primary"
            onClick={save}
            loading={loading}
            disabled={selected.size < MIN_SELECTIONS}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
