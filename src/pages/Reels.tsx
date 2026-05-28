/**
 * Reels — vertical, full-bleed feed.
 *
 *  - Scroll-snap-y on the scroll container so each reel lands flush.
 *  - At most 5 player instances mounted at once: the active card + 2 above +
 *    2 below. Anything outside that window renders a thin placeholder so the
 *    scroll container keeps the right total height for the snap layout.
 *  - The "active" reel is decided by an IntersectionObserver: whichever card
 *    is >= 75% visible wins. Only the active card is unmuted (the player
 *    itself defaults to muted; the user opts in by tapping).
 *  - View-ping de-dup is page-scoped (a `Set<string>`) so the same reel
 *    swiped back into view this session doesn't ping again.
 *
 * F4.1 adds the Following/Discover segmented control; F3.* wires the rail
 * actions (like / comment / share). For F1 we only render the Discover feed
 * and stub the engagement callbacks.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Film } from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Spinner } from "../components/ui/Spinner";
import { ReelCard } from "../components/reels/ReelCard";
import { ReelCommentsSheet } from "../components/reels/ReelCommentsSheet";
import { ReelShareSheet } from "../components/reels/ReelShareSheet";
import {
  useFollowingReelsFeed,
  useInfiniteReelsDiscover,
  useRegisterReelView,
  useToggleReelLike,
} from "../hooks/useReels";
import { ApiError } from "../lib/api";
import type { Reel } from "../types/api";
import styles from "./Reels.module.css";

type FeedMode = "discover" | "following";

const WINDOW_RADIUS = 2;
const VISIBILITY_THRESHOLD = 0.75;
const NEXT_PAGE_TRIGGER_DISTANCE = 3;

export default function Reels() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<FeedMode>("discover");
  const discover = useInfiniteReelsDiscover();
  const following = useFollowingReelsFeed();
  const registerView = useRegisterReelView();
  const toggleLike = useToggleReelLike();

  const discoverReels: Reel[] = useMemo(
    () => discover.data?.pages.flatMap((p) => p.reels) ?? [],
    [discover.data]
  );
  const followingReels: Reel[] = useMemo(
    () => following.data?.reels ?? [],
    [following.data]
  );

  const reels = mode === "discover" ? discoverReels : followingReels;
  const isPending = mode === "discover" ? discover.isPending : following.isPending;
  const error = mode === "discover" ? discover.error : following.error;
  const refetchActive = () =>
    mode === "discover" ? discover.refetch() : following.refetch();
  const isFetching = mode === "discover" ? discover.isFetching : following.isFetching;

  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const viewedRef = useRef<Set<string>>(new Set());
  const [commentsReel, setCommentsReel] = useState<Reel | null>(null);
  const [shareReel, setShareReel] = useState<Reel | null>(null);

  // Reset scroll position + active card whenever the user switches feeds
  // so the new feed always starts on its first item.
  // Done as a render-phase compare rather than an effect — see React 19
  // "you might not need an effect" guidance — which also satisfies the
  // `react-hooks/set-state-in-effect` lint rule.
  const [prevMode, setPrevMode] = useState(mode);
  if (mode !== prevMode) {
    setPrevMode(mode);
    setActiveIndex(0);
  }

  // Track which reel is most-visible. Each item registers itself with the
  // observer below; whichever is >= VISIBILITY_THRESHOLD wins (ties break to
  // whichever fired most recently — fine for a vertical snap list).
  useEffect(() => {
    if (reels.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= VISIBILITY_THRESHOLD) {
            const idxAttr = (entry.target as HTMLElement).dataset.index;
            if (idxAttr) {
              const idx = Number(idxAttr);
              if (!Number.isNaN(idx)) setActiveIndex(idx);
            }
          }
        }
      },
      { threshold: [0, VISIBILITY_THRESHOLD, 1] }
    );

    for (const el of itemRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [reels.length]);

  // Auto-paginate (Discover only — Following is a fixed top-N from the backend).
  useEffect(() => {
    if (mode !== "discover") return;
    if (
      discoverReels.length > 0 &&
      activeIndex >= discoverReels.length - NEXT_PAGE_TRIGGER_DISTANCE &&
      discover.hasNextPage &&
      !discover.isFetchingNextPage
    ) {
      discover.fetchNextPage();
    }
  }, [
    mode,
    activeIndex,
    discoverReels.length,
    discover.hasNextPage,
    discover.isFetchingNextPage,
    discover,
  ]);

  const handleView = useCallback(
    (reelId: string) => {
      if (viewedRef.current.has(reelId)) return;
      viewedRef.current.add(reelId);
      registerView.mutate(reelId);
    },
    [registerView]
  );

  const handleLike = useCallback(
    (reelId: string) => {
      toggleLike.mutate(reelId);
    },
    [toggleLike]
  );
  const handleComment = useCallback((reel: Reel) => {
    setCommentsReel(reel);
  }, []);
  const handleShare = useCallback((reel: Reel) => {
    setShareReel(reel);
  }, []);

  const segmentedControl = (
    <div className={styles.segmented} role="tablist" aria-label="Reels feed mode">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "following"}
        className={`${styles.segmentBtn} ${
          mode === "following" ? styles.segmentBtnActive : ""
        }`}
        onClick={() => setMode("following")}
      >
        Following
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "discover"}
        className={`${styles.segmentBtn} ${
          mode === "discover" ? styles.segmentBtnActive : ""
        }`}
        onClick={() => setMode("discover")}
      >
        Discover
      </button>
    </div>
  );

  if (isPending) {
    return (
      <PageLayout navKey="reels" title="Reels" theme="dark">
        {segmentedControl}
        <div className={styles.loading}>
          <Spinner /> Loading reels…
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout navKey="reels" title="Reels" theme="dark">
        {segmentedControl}
        <ErrorBox
          variant="page"
          title="Could not load reels"
          message={error instanceof ApiError ? error.message : "Network error"}
          onRetry={() => refetchActive()}
        />
      </PageLayout>
    );
  }

  if (reels.length === 0) {
    // Empty state copy follows REELS_FEATURE_SPEC.md §5.3.
    return (
      <PageLayout navKey="reels" title="Reels" theme="dark">
        {segmentedControl}
        <div className={styles.emptyWrap}>
          <EmptyState
            icon={<Film size={36} aria-hidden />}
            title={
              mode === "following"
                ? "No reels from people you follow"
                : "No reels yet"
            }
            description={
              mode === "following"
                ? "Follow more creators or check Discover for trending clips."
                : "Be the first — share a short clip from the Create button."
            }
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout navKey="reels" hideHeader theme="dark">
      {segmentedControl}
      <div
        className={styles.feed}
        role="feed"
        aria-label="Reels feed"
        aria-busy={isFetching || undefined}
      >
        {reels.map((reel, idx) => {
          const distance = Math.abs(idx - activeIndex);
          const inWindow = distance <= WINDOW_RADIUS;
          return (
            <div
              key={reel.id}
              data-index={idx}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              className={styles.slot}
              aria-setsize={reels.length}
              aria-posinset={idx + 1}
            >
              {inWindow ? (
                <ReelCard
                  reel={reel}
                  active={idx === activeIndex}
                  onView={handleView}
                  onLike={handleLike}
                  onComment={handleComment}
                  onShare={handleShare}
                />
              ) : (
                // Placeholder keeps the scroll container's height stable
                // and the snap layout intact. The poster gives the user a
                // preview while the player is unmounted.
                <div
                  className={styles.placeholder}
                  style={
                    reel.thumbnailUrl
                      ? { backgroundImage: `url(${reel.thumbnailUrl})` }
                      : undefined
                  }
                  aria-hidden
                />
              )}
            </div>
          );
        })}
        {mode === "discover" && discover.isFetchingNextPage ? (
          <div className={styles.loadingMore} role="status">
            <Spinner /> Loading more…
          </div>
        ) : null}
      </div>

      {/*
       * Floating compose button — placed on the Reels page itself in
       * addition to the Create sheet so video creation always has a one-tap
       * affordance from the feed.
       */}
      <button
        type="button"
        className={styles.fab}
        onClick={() => navigate("/compose/reel")}
        aria-label="Compose a new reel"
      >
        +
      </button>

      <ReelCommentsSheet
        reel={commentsReel}
        onClose={() => setCommentsReel(null)}
      />
      <ReelShareSheet
        reel={shareReel}
        onClose={() => setShareReel(null)}
      />
    </PageLayout>
  );
}
