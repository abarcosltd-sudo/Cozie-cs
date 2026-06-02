import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Globe, Lock, Music, Search, X } from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "../contexts/AuthContext";
import { api, ApiError } from "../lib/api";
import type { MusicTrack, PostVisibility } from "../types/api";
import styles from "./ShareMusic.module.css";

interface SearchResponse {
  songs: Pick<MusicTrack, "id" | "title" | "artist" | "albumArtUrl">[];
}

const CAPTION_MAX = 300;

export default function ShareMusic() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isArtist = user?.userType === "artist";
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<SearchResponse["songs"][number] | null>(
    null
  );
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Artists default to a Bubble post — that's their core value prop in
  // this flow. Listeners can't see this picker; their posts are always
  // public and the visibility field is omitted from the request.
  const [visibility, setVisibility] = useState<PostVisibility>(
    isArtist ? "bubble" : "public"
  );

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(id);
  }, [query]);

  const searchQuery = useQuery({
    queryKey: ["music", "search", debouncedQuery],
    queryFn: ({ signal }) =>
      api.get<SearchResponse>(
        `/api/music/search?q=${encodeURIComponent(debouncedQuery)}`,
        { signal }
      ),
    enabled: debouncedQuery.length > 0 && !selected,
  });

  const shareMut = useMutation({
    mutationFn: () => {
      const body: {
        songId: string;
        caption: string;
        visibility?: PostVisibility;
      } = {
        songId: selected!.id,
        caption: caption.trim(),
      };
      if (isArtist) body.visibility = visibility;
      return api.post<{ postId: string }>("/api/posts/share-music", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["bubble"] });
      if (isArtist && visibility === "bubble" && user) {
        navigate(`/bubble/${user.id}`);
      } else {
        navigate("/home-feed");
      }
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to share");
    },
  });

  const showResults = debouncedQuery.length > 0 && !selected;

  return (
    <PageLayout
      title="Share music"
      showBack
      headerRight={
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            if (!selected) {
              setError("Pick a song first.");
              return;
            }
            setError(null);
            shareMut.mutate();
          }}
          loading={shareMut.isPending}
          disabled={!selected}
        >
          Post
        </Button>
      }
      hideBottomNav
    >
      <div className={styles.body}>
        {error ? <ErrorBox variant="inline" message={error} /> : null}

        <div className={styles.searchBar}>
          <Search size={18} aria-hidden className={styles.searchIcon} />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selected) setSelected(null);
            }}
            placeholder="Search for a song…"
            aria-label="Search for a song to share"
            className={styles.searchInput}
            autoFocus
          />
          {query ? (
            <button
              type="button"
              className={styles.searchClear}
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X size={16} aria-hidden />
            </button>
          ) : null}
        </div>

        {showResults ? (
          searchQuery.isPending ? (
            <div className={styles.loading}>
              <Spinner /> Searching…
            </div>
          ) : searchQuery.error ? (
            <ErrorBox
              variant="inline"
              message="Search failed"
              onRetry={() => searchQuery.refetch()}
            />
          ) : !searchQuery.data?.songs?.length ? (
            <div className={styles.empty}>No songs found</div>
          ) : (
            <ul className={styles.results}>
              {searchQuery.data.songs.map((song) => (
                <li key={song.id}>
                  <button
                    type="button"
                    className={styles.resultRow}
                    onClick={() => {
                      setSelected(song);
                      setQuery("");
                    }}
                  >
                    <Avatar
                      src={song.albumArtUrl || null}
                      name={song.title}
                      seed={song.id}
                      size={44}
                    />
                    <span className={styles.resultInfo}>
                      <span className={styles.resultTitle}>{song.title}</span>
                      <span className={styles.resultArtist}>{song.artist}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {selected ? (
          <div className={styles.selected}>
            <Avatar
              src={selected.albumArtUrl || null}
              name={selected.title}
              seed={selected.id}
              size={72}
            />
            <div className={styles.selectedMeta}>
              <div className={styles.selectedTitle}>{selected.title}</div>
              <div className={styles.selectedArtist}>{selected.artist}</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(null)}
              aria-label="Change song"
            >
              Change
            </Button>
          </div>
        ) : !showResults ? (
          <div className={styles.placeholder}>
            <Music size={36} aria-hidden />
            <p>Search for a song to share with your friends.</p>
          </div>
        ) : null}

        <label className={styles.captionLabel} htmlFor="share-caption">
          Caption (optional)
        </label>
        <textarea
          id="share-caption"
          className={styles.captionInput}
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_MAX))}
          placeholder="Say something about this song…"
          rows={3}
        />
        <div className={styles.captionCount}>
          {caption.length} / {CAPTION_MAX}
        </div>

        {isArtist ? (
          <section
            className={styles.visibilitySection}
            aria-label="Post visibility"
          >
            <span className={styles.visibilityLabel}>Visibility</span>
            <VisibilityOption
              active={visibility === "bubble"}
              onSelect={() => setVisibility("bubble")}
              icon={<Lock size={14} aria-hidden />}
              title="Bubble Only"
              subtitle="Visible to bubble members only. Sharing disabled until you release it."
            />
            <VisibilityOption
              active={visibility === "public"}
              onSelect={() => setVisibility("public")}
              icon={<Globe size={14} aria-hidden />}
              title="Public (Released)"
              subtitle="Visible to all followers. Sharing enabled immediately."
            />
          </section>
        ) : null}
      </div>
    </PageLayout>
  );
}

interface VisibilityOptionProps {
  active: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

function VisibilityOption({
  active,
  onSelect,
  icon,
  title,
  subtitle,
}: VisibilityOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`${styles.visibilityOption} ${
        active ? styles.visibilityOptionActive : ""
      }`}
    >
      <span
        className={`${styles.visibilityRadio} ${
          active ? styles.visibilityRadioActive : ""
        }`}
        aria-hidden
      >
        {active ? <Check size={12} aria-hidden /> : null}
      </span>
      <span className={styles.visibilityOptionBody}>
        <span className={styles.visibilityOptionTitle}>
          {icon}
          {title}
        </span>
        <span className={styles.visibilityOptionSubtitle}>{subtitle}</span>
      </span>
    </button>
  );
}
