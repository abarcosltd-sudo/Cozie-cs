import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, X } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { useAuth } from "../contexts/AuthContext";
import { api, ApiError } from "../lib/api";
import authStyles from "./_authShared.module.css";
import styles from "./ProfileSetup.module.css";

const BIO_SUGGESTIONS = [
  "🎵 Music is life",
  "🎧 Always vibing",
  "🎸 Rock enthusiast",
  "✨ Living for the beat",
];

interface UploadUrlResponse {
  signedUrl: string;
  publicUrl: string;
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prefill from AuthContext user.
  useEffect(() => {
    if (!user) return;
    if (user.displayName) setDisplayName(user.displayName);
    if (user.username) setUsername(user.username);
    if (user.bio) setBio(user.bio);
    if (user.photoURL) setPhotoPreview(user.photoURL);
  }, [user]);

  // Avoid the FileReader leak: revoke object URLs on unmount.
  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const onPhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      return;
    }
    setError(null);
    setPhotoFile(file);
    setPhotoRemoved(false);
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(null);
    setPhotoFile(null);
    setPhotoRemoved(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = (): string | null => {
    if (displayName.trim().length < 2)
      return "Display name must be at least 2 characters.";
    if (username.trim().length < 3)
      return "Username must be at least 3 characters.";
    if (!/^[a-z0-9_]+$/.test(username.trim()))
      return "Usernames can only contain lowercase letters, numbers, and underscores.";
    return null;
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const { signedUrl, publicUrl } = await api.post<UploadUrlResponse>(
      "/api/users/generate-upload-url",
      { fileName: file.name, fileType: file.type }
    );
    await api.putExternal(signedUrl, file, file.type);
    return publicUrl;
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim() || null,
      };
      if (photoRemoved) {
        payload.removePhoto = true;
      } else if (photoFile) {
        payload.photoURL = await uploadPhoto(photoFile);
      }
      await api.put("/api/users/profile", payload);
      await refreshUser();
      navigate("/connect-music");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to save profile"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={authStyles.page}>
      <div className={`${authStyles.container} ${styles.container}`}>
        <div className={styles.heading}>
          <h2>Set up your profile</h2>
          <p>Help friends recognize you and express yourself.</p>
        </div>

        {error ? <ErrorBox variant="inline" message={error} /> : null}

        <div className={styles.photoSection}>
          <button
            type="button"
            className={styles.photoWrap}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Choose profile photo"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Profile preview" />
            ) : (
              <Avatar name={displayName || username || "user"} size={120} />
            )}
            <span className={styles.photoOverlay} aria-hidden>
              <Camera size={20} />
              <span>Change photo</span>
            </span>
          </button>
          {photoPreview ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={removePhoto}
              leftIcon={<X size={14} aria-hidden />}
            >
              Remove
            </Button>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onPhotoSelect}
            className="sr-only"
            aria-hidden
          />
          <p className={styles.photoHint}>
            Square image, at least 400×400, max 5 MB.
          </p>
        </div>

        <form className={authStyles.form} onSubmit={onSubmit} noValidate>
          <div className={authStyles.field}>
            <label htmlFor="ps-displayname" className={authStyles.label}>
              Display name
            </label>
            <input
              id="ps-displayname"
              type="text"
              className={authStyles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              required
              disabled={loading}
            />
          </div>
          <div className={authStyles.field}>
            <label htmlFor="ps-username" className={authStyles.label}>
              Username
            </label>
            <input
              id="ps-username"
              type="text"
              className={authStyles.input}
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
              }
              minLength={3}
              maxLength={20}
              required
              disabled={loading}
            />
          </div>
          <div className={authStyles.field}>
            <label htmlFor="ps-bio" className={authStyles.label}>
              Bio
            </label>
            <textarea
              id="ps-bio"
              className={authStyles.input}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 150))}
              rows={3}
              maxLength={150}
              disabled={loading}
            />
            <div className={styles.suggestionRow}>
              {BIO_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={styles.suggestion}
                  onClick={() => setBio(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <Button
              variant="ghost"
              onClick={() => navigate("/connect-music")}
              disabled={loading}
              type="button"
            >
              Skip for now
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Continue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
