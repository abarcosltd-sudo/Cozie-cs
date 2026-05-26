import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, ImagePlus, Music, X } from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { api, ApiError } from "../lib/api";
import styles from "./AddMusic.module.css";

const VALID_AUDIO = /\.(mp3|wav|flac)$/i;
const MAX_AUDIO_MB = 50;
const MAX_ART_MB = 5;

const GENRES = [
  "Pop",
  "Rock",
  "Hip Hop",
  "Electronic",
  "Jazz",
  "Classical",
  "R&B/Soul",
  "Country",
  "Indie",
  "Reggae",
  "Latin",
  "Afrobeats",
];

interface UploadUrl {
  signedUrl: string;
  publicUrl: string;
}

interface AddMusicForm {
  title: string;
  artist: string;
  featuredArtists: string;
  album: string;
  genre: string | null;
  subgenre: string;
  mood: string;
  producer: string;
  songwriter: string;
  composer: string;
  recordLabel: string;
  releaseDate: string;
  releaseYear: string;
  country: string;
  language: string;
  duration: string;
  bpm: string;
  musicalKey: string;
  isrc: string;
  explicit: "yes" | "no" | "edited";
  copyright: string;
  publishingRights: string;
  originalWork: boolean;
  description: string;
  lyrics: string;
  tags: string;
}

const INITIAL_FORM: AddMusicForm = {
  title: "",
  artist: "",
  featuredArtists: "",
  album: "",
  genre: null,
  subgenre: "",
  mood: "",
  producer: "",
  songwriter: "",
  composer: "",
  recordLabel: "",
  releaseDate: "",
  releaseYear: new Date().getFullYear().toString(),
  country: "",
  language: "",
  duration: "",
  bpm: "",
  musicalKey: "",
  isrc: "",
  explicit: "no",
  copyright: "",
  publishingRights: "",
  originalWork: false,
  description: "",
  lyrics: "",
  tags: "",
};

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AddMusic() {
  const navigate = useNavigate();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const artInputRef = useRef<HTMLInputElement>(null);

  const [audio, setAudio] = useState<File | null>(null);
  const [art, setArt] = useState<File | null>(null);
  const [artPreview, setArtPreview] = useState<string | null>(null);
  const [form, setForm] = useState<AddMusicForm>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (artPreview && artPreview.startsWith("blob:")) {
        URL.revokeObjectURL(artPreview);
      }
    };
  }, [artPreview]);

  const onAudioPick = (file: File | undefined) => {
    if (!file) return;
    if (
      !["audio/mpeg", "audio/mp3", "audio/wav", "audio/flac"].includes(
        file.type
      ) &&
      !VALID_AUDIO.test(file.name)
    ) {
      setError("Upload a valid MP3, WAV, or FLAC file.");
      return;
    }
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
      setError(`Audio must be smaller than ${MAX_AUDIO_MB} MB.`);
      return;
    }
    setError(null);
    setAudio(file);
  };

  const onArtPick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Album art must be an image file.");
      return;
    }
    if (file.size > MAX_ART_MB * 1024 * 1024) {
      setError(`Album art must be smaller than ${MAX_ART_MB} MB.`);
      return;
    }
    setError(null);
    if (artPreview && artPreview.startsWith("blob:")) {
      URL.revokeObjectURL(artPreview);
    }
    setArt(file);
    setArtPreview(URL.createObjectURL(file));
  };

  const setField = <K extends keyof AddMusicForm>(
    key: K,
    value: AddMusicForm[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): string | null => {
    if (!audio) return "Pick an audio file.";
    if (!form.title.trim()) return "Add a song title.";
    if (!form.artist.trim()) return "Add the artist name.";
    if (!form.genre) return "Pick a genre.";
    if (!form.producer.trim()) return "Add the producer(s).";
    if (!form.releaseDate) return "Add a release date.";
    if (!form.releaseYear) return "Add a release year.";
    if (!form.language) return "Pick a language.";
    if (!form.originalWork)
      return "Confirm you have the rights to upload this music.";
    return null;
  };

  const onSubmit = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const audioUrlInfo = await api.post<UploadUrl>(
        "/api/music/generate-upload-url",
        {
          fileName: audio!.name,
          fileType: audio!.type,
          filePurpose: "audio",
        }
      );
      await api.putExternal(audioUrlInfo.signedUrl, audio!, audio!.type);
      setProgress(50);

      let albumArtUrl: string | null = null;
      if (art) {
        const artUrlInfo = await api.post<UploadUrl>(
          "/api/music/generate-album-art-url",
          { fileName: art.name, fileType: art.type }
        );
        await api.putExternal(artUrlInfo.signedUrl, art, art.type);
        albumArtUrl = artUrlInfo.publicUrl;
      }
      setProgress(80);

      await api.post("/api/music/add-music", {
        ...form,
        fileUrl: audioUrlInfo.publicUrl,
        albumArtUrl,
      });
      setProgress(100);
      setSuccess(true);
      setTimeout(() => navigate("/home-feed"), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    onAudioPick(e.dataTransfer.files?.[0]);
  };

  const goBack = () => {
    if (audio && !window.confirm("Discard your upload?")) return;
    navigate(-1);
  };

  return (
    <PageLayout
      title="Add music"
      onBack={goBack}
      showBack
      headerRight={
        <Button
          variant="primary"
          size="sm"
          onClick={onSubmit}
          loading={uploading}
          disabled={!audio}
        >
          Upload
        </Button>
      }
      hideBottomNav
    >
      <div className={styles.body}>
        {success ? (
          <div className={styles.success} role="status" aria-live="polite">
            <CheckCircle size={28} aria-hidden />
            <strong>Music uploaded</strong>
            <span>Your track is now live on Cozie.</span>
          </div>
        ) : null}
        {error ? <ErrorBox variant="inline" message={error} /> : null}

        {!audio ? (
          <div
            className={`${styles.dropzone} ${isDragging ? styles.dropActive : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => audioInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                audioInputRef.current?.click();
              }
            }}
            aria-label="Choose audio file"
          >
            <Music size={32} aria-hidden />
            <div className={styles.dropTitle}>Upload your music</div>
            <div className={styles.dropSubtitle}>
              Drag &amp; drop or click to browse
            </div>
            <div className={styles.dropFormats}>MP3 · WAV · FLAC (max {MAX_AUDIO_MB} MB)</div>
          </div>
        ) : (
          <div className={styles.filePreview}>
            <Music size={22} aria-hidden />
            <div className={styles.filePreviewMeta}>
              <strong>{audio.name}</strong>
              <span>{formatBytes(audio.size)}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAudio(null)}
              aria-label="Remove file"
            >
              <X size={16} aria-hidden />
            </Button>
          </div>
        )}
        <input
          ref={audioInputRef}
          type="file"
          accept=".mp3,.wav,.flac,audio/*"
          className="sr-only"
          aria-hidden
          onChange={(e) => onAudioPick(e.target.files?.[0])}
        />

        {audio ? (
          <>
            <Section title="Basic">
              <TextField
                label="Song title"
                required
                value={form.title}
                onChange={(v) => setField("title", v)}
              />
              <TextField
                label="Artist name"
                required
                value={form.artist}
                onChange={(v) => setField("artist", v)}
              />
              <TextField
                label="Featured artists"
                hint="Comma separated"
                value={form.featuredArtists}
                onChange={(v) => setField("featuredArtists", v)}
              />
              <TextField
                label="Album"
                value={form.album}
                onChange={(v) => setField("album", v)}
              />

              <div className={styles.field}>
                <label className={styles.label}>Album art</label>
                <div className={styles.artUpload}>
                  <button
                    type="button"
                    className={styles.artPreview}
                    onClick={() => artInputRef.current?.click()}
                    aria-label="Choose album art"
                  >
                    {artPreview ? (
                      <img src={artPreview} alt="Album art preview" />
                    ) : (
                      <div className={styles.artPlaceholder}>
                        <ImagePlus size={24} aria-hidden />
                        <span>Add cover</span>
                      </div>
                    )}
                  </button>
                  <p className={styles.artHint}>
                    Square (3000×3000 recommended) — max {MAX_ART_MB} MB.
                  </p>
                </div>
                <input
                  ref={artInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-hidden
                  onChange={(e) => onArtPick(e.target.files?.[0])}
                />
              </div>
            </Section>

            <Section title="Genre &amp; vibe">
              <div className={styles.field}>
                <label className={styles.label}>
                  Primary genre <span className={styles.req}>*</span>
                </label>
                <div className={styles.genreGrid}>
                  {GENRES.map((g) => {
                    const key = g.toLowerCase().replace(/[&/]/g, "");
                    const active = form.genre === key;
                    return (
                      <button
                        key={g}
                        type="button"
                        className={`${styles.genrePill} ${
                          active ? styles.genrePillActive : ""
                        }`}
                        aria-pressed={active}
                        onClick={() => setField("genre", key)}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>
              <TextField
                label="Subgenre / style"
                value={form.subgenre}
                onChange={(v) => setField("subgenre", v)}
              />
              <TextField
                label="Mood / vibe"
                value={form.mood}
                onChange={(v) => setField("mood", v)}
              />
            </Section>

            <Section title="Credits">
              <TextField
                label="Producer(s)"
                required
                value={form.producer}
                onChange={(v) => setField("producer", v)}
              />
              <TextField
                label="Songwriter(s)"
                value={form.songwriter}
                onChange={(v) => setField("songwriter", v)}
              />
              <TextField
                label="Composer(s)"
                value={form.composer}
                onChange={(v) => setField("composer", v)}
              />
              <TextField
                label="Record label"
                value={form.recordLabel}
                onChange={(v) => setField("recordLabel", v)}
              />
            </Section>

            <Section title="Release">
              <div className={styles.row}>
                <TextField
                  label="Release date"
                  required
                  type="date"
                  value={form.releaseDate}
                  onChange={(v) => setField("releaseDate", v)}
                />
                <TextField
                  label="Release year"
                  required
                  type="number"
                  value={form.releaseYear}
                  onChange={(v) => setField("releaseYear", v)}
                />
              </div>
              <SelectField
                label="Language"
                required
                value={form.language}
                onChange={(v) => setField("language", v)}
                options={[
                  ["", "Select language"],
                  ["english", "English"],
                  ["spanish", "Spanish"],
                  ["french", "French"],
                  ["portuguese", "Portuguese"],
                  ["korean", "Korean"],
                  ["japanese", "Japanese"],
                  ["mandarin", "Mandarin"],
                  ["hindi", "Hindi"],
                  ["arabic", "Arabic"],
                  ["yoruba", "Yoruba"],
                  ["instrumental", "Instrumental"],
                  ["other", "Other"],
                ]}
              />
            </Section>

            <Section title="Rights">
              <div className={styles.field}>
                <label className={styles.label}>Explicit content</label>
                <div className={styles.radios}>
                  {(["yes", "no", "edited"] as const).map((v) => (
                    <label key={v} className={styles.radio}>
                      <input
                        type="radio"
                        name="explicit"
                        value={v}
                        checked={form.explicit === v}
                        onChange={() => setField("explicit", v)}
                      />
                      <span>
                        {v === "yes"
                          ? "Yes — explicit lyrics"
                          : v === "no"
                          ? "No — clean"
                          : "Edited — censored"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={form.originalWork}
                  onChange={(e) => setField("originalWork", e.target.checked)}
                />
                <span>I confirm I own this work or have full rights.</span>
              </label>
            </Section>
          </>
        ) : null}

        {uploading ? (
          <div
            className={styles.progressWrap}
            role="status"
            aria-live="polite"
          >
            <div className={styles.progressLabel}>
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required,
  hint,
}: TextFieldProps) {
  const id = `am-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label} {required ? <span className={styles.req}>*</span> : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className={styles.input}
      />
      {hint ? <div className={styles.hint}>{hint}</div> : null}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  required?: boolean;
}

function SelectField({ label, value, onChange, options, required }: SelectFieldProps) {
  const id = `am-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label} {required ? <span className={styles.req}>*</span> : null}
      </label>
      <select
        id={id}
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
