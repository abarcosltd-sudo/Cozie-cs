import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { PageLayout } from "../components/layout/PageLayout";
import { ErrorBox } from "../components/ui/ErrorBox";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { Avatar } from "../components/ui/Avatar";
import type { MusicTrack } from "../types/api";
import styles from "./SearchResults.module.css";

interface SearchResponse {
  songs: Pick<MusicTrack, "id" | "title" | "artist" | "albumArtUrl">[];
}

export default function SearchResults() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialQuery = params.get("q") || "";
  const [input, setInput] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Debounce the live input so we don't fire on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(input.trim()), 300);
    return () => clearTimeout(id);
  }, [input]);

  // Keep the URL in sync with the debounced query so refresh / share works.
  useEffect(() => {
    if (debouncedQuery !== (params.get("q") || "")) {
      setParams(
        debouncedQuery ? { q: debouncedQuery } : {},
        { replace: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const query = useQuery({
    queryKey: ["music", "search", debouncedQuery],
    queryFn: ({ signal }) =>
      api.get<SearchResponse>(
        `/api/music/search?q=${encodeURIComponent(debouncedQuery)}`,
        { signal }
      ),
    enabled: debouncedQuery.length > 0,
  });

  const errorMessage = useMemo(() => {
    if (!query.error) return null;
    return query.error instanceof ApiError
      ? query.error.message
      : "Search failed";
  }, [query.error]);

  return (
    <PageLayout title="Search" showBack navKey="search">
      <div className={styles.searchBar}>
        <Search size={18} aria-hidden className={styles.icon} />
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Songs, artists…"
          className={styles.input}
          aria-label="Search songs and artists"
          autoFocus
        />
      </div>

      <div className={styles.body}>
        {!debouncedQuery ? (
          <EmptyState
            icon={<Search size={36} aria-hidden />}
            title="Search Cozie"
            description="Find a song, an artist, or someone to follow."
          />
        ) : query.isPending ? (
          <div className={styles.loading}>
            <Spinner /> Searching…
          </div>
        ) : errorMessage ? (
          <ErrorBox
            variant="page"
            title="Search failed"
            message={errorMessage}
            onRetry={() => query.refetch()}
          />
        ) : !query.data?.songs?.length ? (
          <EmptyState
            title={`No matches for “${debouncedQuery}”`}
            description="Try a different keyword or check the spelling."
          />
        ) : (
          <ul className={styles.results}>
            {query.data.songs.map((song) => (
              <li key={song.id}>
                <button
                  type="button"
                  className={styles.row}
                  onClick={() =>
                    navigate("/play-music", {
                      state: {
                        currentSong: { ...song, fileUrl: null, duration: 0 },
                      },
                    })
                  }
                >
                  <Avatar
                    src={song.albumArtUrl || null}
                    name={song.title}
                    seed={song.id}
                    size={48}
                  />
                  <span className={styles.meta}>
                    <span className={styles.title}>{song.title}</span>
                    <span className={styles.artist}>{song.artist}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageLayout>
  );
}
