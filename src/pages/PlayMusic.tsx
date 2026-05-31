import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Rewind,
  Shuffle,
  SkipBack,
  SkipForward,
  FastForward,
} from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Spinner } from "../components/ui/Spinner";
import { api } from "../lib/api";
import { useTrending } from "../hooks/useProfile";
import type { MusicTrack } from "../types/api";
import styles from "./PlayMusic.module.css";

type RepeatMode = "off" | "all" | "one";

interface LocationState {
  currentSong?: MusicTrack;
  queue?: MusicTrack[];
  startFromSongId?: string;
}

function formatSeconds(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function PlayMusic() {
  const location = useLocation();
  const qc = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trending = useTrending();

  const { currentSong, queue: passedQueue, startFromSongId } =
    (location.state as LocationState) || {};

  const [queue, setQueue] = useState<MusicTrack[]>(passedQueue ?? []);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");

  // Boot the queue.
  useEffect(() => {
    if (passedQueue && passedQueue.length > 0) {
      const startIdx = startFromSongId
        ? Math.max(
            0,
            passedQueue.findIndex((t) => t.id === startFromSongId)
          )
        : currentSong
        ? Math.max(
            0,
            passedQueue.findIndex((t) => t.id === currentSong.id)
          )
        : 0;
      setQueue(passedQueue);
      setIndex(startIdx);
      return;
    }
    if (currentSong) {
      const list = trending.data?.trending ?? [];
      const exists = list.some((t) => t.id === currentSong.id);
      const nextQueue = exists ? list : [currentSong, ...list];
      setQueue(nextQueue);
      setIndex(Math.max(0, nextQueue.findIndex((t) => t.id === currentSong.id)));
      return;
    }
    if (trending.data?.trending?.length) {
      setQueue(trending.data.trending);
      setIndex(0);
    }
  }, [trending.data?.trending, currentSong, passedQueue, startFromSongId]);

  const track = queue[index] || null;
  const trackId = track?.id;

  // Like state for the current track (server-truth via query).
  const likeQuery = useQuery({
    queryKey: ["music", "like", trackId],
    queryFn: () =>
      api.get<{ liked: boolean; likeCount: number }>(
        `/api/music/${trackId}/like-status`
      ),
    enabled: !!trackId,
    staleTime: 60_000,
  });
  const likeMut = useMutation({
    mutationFn: () => api.post<{ liked: boolean; likeCount: number }>(
      `/api/music/${trackId}/like`
    ),
    onSuccess: (data) => {
      qc.setQueryData(["music", "like", trackId], data);
    },
  });

  // Favorite state (a separate concept in the backend).
  const favQuery = useQuery({
    queryKey: ["music", "favorite", trackId],
    queryFn: () =>
      api.get<{ isFavorited: boolean }>(`/api/users/favorites/${trackId}`),
    enabled: !!trackId,
    staleTime: 60_000,
  });
  const favMut = useMutation<{ ok: boolean }, Error, void, { prev: typeof favQuery.data }>({
    mutationFn: async () => {
      const fav = favQuery.data?.isFavorited;
      if (fav) {
        await api.delete<{ removed: boolean }>(
          `/api/users/favorites/${trackId}`
        );
      } else {
        await api.post<{ added: boolean }>(`/api/users/favorites/${trackId}`);
      }
      return { ok: true };
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["music", "favorite", trackId] });
      const prev = favQuery.data;
      qc.setQueryData(["music", "favorite", trackId], {
        isFavorited: !prev?.isFavorited,
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["music", "favorite", trackId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["music", "favorite", trackId] });
    },
  });

  // Wire audio element to track changes. Volume is left at the
  // `HTMLMediaElement` default (1.0) — the OS / browser / hardware
  // controls are the source of truth so we don't ship an in-app slider.
  useEffect(() => {
    if (!audioRef.current || !track?.fileUrl) return;
    audioRef.current.src = track.fileUrl;
    audioRef.current.load();
    setCurrentTime(0);
    setDuration(0);
    if (isPlaying) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId]);

  const advance = (direction: 1 | -1) => {
    if (queue.length === 0) return;
    if (shuffle) {
      setIndex(Math.floor(Math.random() * queue.length));
      return;
    }
    setIndex((idx) => (idx + direction + queue.length) % queue.length);
  };

  const onEnded = () => {
    if (repeat === "one" && audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play();
      return;
    }
    if (repeat === "all" || index < queue.length - 1) {
      advance(1);
    } else {
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !track?.fileUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      void audioRef.current.play().catch(() => setIsPlaying(false));
    }
  };

  const seekTo = (t: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, t));
    setCurrentTime(audioRef.current.currentTime);
  };

  const upNext = useMemo(
    () => queue.slice(index + 1, index + 11),
    [queue, index]
  );

  if (trending.isPending && !track) {
    return (
      <PageLayout title="Now Playing" showBack hideBottomNav>
        <div className={styles.loading}>
          <Spinner /> Loading…
        </div>
      </PageLayout>
    );
  }

  if (!track) {
    return (
      <PageLayout title="Now Playing" showBack hideBottomNav>
        <ErrorBox
          variant="page"
          title="Nothing to play"
          message="Pick a song from your feed or discover something new."
          onRetry={() => trending.refetch()}
        />
      </PageLayout>
    );
  }

  const likedByUser = likeQuery.data?.liked ?? false;
  const likeCount = likeQuery.data?.likeCount ?? 0;

  return (
    <PageLayout title="Now Playing" showBack hideBottomNav>
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={() =>
          setDuration(audioRef.current?.duration ?? 0)
        }
        onTimeUpdate={() =>
          setCurrentTime(audioRef.current?.currentTime ?? 0)
        }
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={onEnded}
        onError={(e) => {
          if (e.currentTarget.error) {
            console.error("Audio error:", e.currentTarget.error.code);
          }
        }}
      />

      <div className={styles.player}>
        <div className={styles.artWrap}>
          <div className={`${styles.art} ${isPlaying ? styles.artPlaying : ""}`}>
            {track.albumArtUrl ? (
              <img
                src={track.albumArtUrl}
                alt={`${track.title} cover`}
                loading="lazy"
              />
            ) : (
              <Music size={64} aria-hidden className={styles.artFallback} />
            )}
          </div>
          <button
            type="button"
            className={`${styles.favBtn} ${
              favQuery.data?.isFavorited ? styles.favOn : ""
            }`}
            onClick={() => favMut.mutate()}
            aria-pressed={favQuery.data?.isFavorited || false}
            aria-label={
              favQuery.data?.isFavorited
                ? "Remove from favorites"
                : "Add to favorites"
            }
          >
            <Heart
              size={20}
              aria-hidden
              fill={favQuery.data?.isFavorited ? "currentColor" : "none"}
            />
          </button>
        </div>

        <div className={styles.trackInfo}>
          <h1 className={styles.title}>{track.title}</h1>
          <p className={styles.artist}>{track.artist}</p>
          <div className={styles.meta}>
            {track.genre ? <span>{track.genre}</span> : null}
            {track.releaseYear ? <span>{track.releaseYear}</span> : null}
            <span>{formatSeconds(duration)}</span>
          </div>
        </div>

        <button
          type="button"
          className={`${styles.likeBtn} ${likedByUser ? styles.likeOn : ""}`}
          onClick={() => likeMut.mutate()}
          aria-pressed={likedByUser}
          aria-label={likedByUser ? "Unlike" : "Like"}
        >
          
        </button>

        {!track.fileUrl ? (
          <ErrorBox
            variant="inline"
            message="This song has no playable audio yet."
          />
        ) : null}

        <div className={styles.progressSection}>
          <input
            type="range"
            className={styles.progressBar}
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => seekTo(Number(e.target.value))}
            aria-label="Seek"
            disabled={!track.fileUrl}
          />
          <div className={styles.times}>
            <span>{formatSeconds(currentTime)}</span>
            <span>{formatSeconds(duration)}</span>
          </div>
        </div>

        <div className={styles.controls}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShuffle((s) => !s)}
            aria-pressed={shuffle}
            aria-label="Shuffle"
            className={shuffle ? styles.ctrlActive : ""}
          >
            <Shuffle size={18} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => advance(-1)}
            aria-label="Previous"
          >
            <SkipBack size={22} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => seekTo(currentTime - 15)}
            aria-label="Rewind 15 seconds"
          >
            <Rewind size={18} aria-hidden />
          </Button>
          <button
            type="button"
            className={styles.playBtn}
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={!track.fileUrl}
          >
            {isPlaying ? (
              <Pause size={28} aria-hidden />
            ) : (
              <Play size={28} aria-hidden />
            )}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => seekTo(currentTime + 15)}
            aria-label="Forward 15 seconds"
          >
            <FastForward size={18} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => advance(1)}
            aria-label="Next"
          >
            <SkipForward size={22} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setRepeat((r) =>
                r === "off" ? "all" : r === "all" ? "one" : "off"
              )
            }
            aria-label={`Repeat mode: ${repeat}`}
            className={repeat !== "off" ? styles.ctrlActive : ""}
          >
            {repeat === "one" ? (
              <Repeat1 size={18} aria-hidden />
            ) : (
              <Repeat size={18} aria-hidden />
            )}
          </Button>
        </div>

        {upNext.length > 0 ? (
          <section className={styles.queueSection}>
            <header className={styles.queueHeader}>
              <h2>Up next</h2>
              <span className={styles.queueCount}>{queue.length} songs</span>
            </header>
            <ol className={styles.queueList}>
              {upNext.map((t, i) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={styles.queueRow}
                    onClick={() => setIndex(index + i + 1)}
                  >
                    <span className={styles.queueIdx}>
                      {index + i + 2}
                    </span>
                    <Avatar
                      src={t.albumArtUrl || null}
                      name={t.title}
                      seed={t.id}
                      size={40}
                    />
                    <span className={styles.queueInfo}>
                      <span className={styles.queueTitle}>{t.title}</span>
                      <span className={styles.queueArtist}>{t.artist}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    </PageLayout>
  );
}
