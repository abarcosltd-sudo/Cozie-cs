import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Music, Search, X } from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Spinner } from "../components/ui/Spinner";
import { api, ApiError } from "../lib/api";
import type { MusicTrack } from "../types/api";
import styles from "./ShareMusic.module.css";

interface SearchResponse {
  songs: Pick<MusicTrack, "id" | "title" | "artist" | "albumArtUrl">[];
}

const CAPTION_MAX = 300;

export default function ShareMusic() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<SearchResponse["songs"][number] | null>(
    null
  );
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    mutationFn: () =>
      api.post<{ postId: string }>("/api/posts/share-music", {
        songId: selected!.id,
        caption: caption.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      navigate("/home-feed");
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
      </div>
    </PageLayout>
  );
}
