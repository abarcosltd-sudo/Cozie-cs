/**
 * Single-reel viewer at `/reels/:reelId`.
 *
 * Entry points:
 *   - Notification tap (reel_like / reel_comment) — opens with just the
 *     target reel ID; we hydrate the reel doc and (best-effort) the
 *     surrounding reels by the same author so the user can vertical-swipe
 *     through the rest of that author's catalogue.
 *   - Deep link / copy-link share.
 *   - Profile reel-tile tap.
 *
 * The author's reel list comes from `useUserReels(reel.userId)` once the
 * focused reel has loaded. We splice the focused reel to the front (if it
 * wasn't already in the page) so the windowed list code in `Reels.tsx`
 * stays uniform.
 *
 * View pings, like / share / comment behave identically to the Reels page.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Film } from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Spinner } from "../components/ui/Spinner";
import { ReelCard } from "../components/reels/ReelCard";
import { ReelCommentsSheet } from "../components/reels/ReelCommentsSheet";
import { ReelShareSheet } from "../components/reels/ReelShareSheet";
import {
  useReel,
  useRegisterReelView,
  useToggleReelLike,
  useUserReels,
} from "../hooks/useReels";
import { ApiError } from "../lib/api";
import type { Reel } from "../types/api";
import styles from "./Reels.module.css";
import detailStyles from "./ReelDetail.module.css";

const WINDOW_RADIUS = 2;
const VISIBILITY_THRESHOLD = 0.75;

export default function ReelDetail() {
  const { reelId } = useParams<{ reelId: string }>();
  const navigate = useNavigate();
  const focused = useReel(reelId);
  const userReelsQuery = useUserReels(focused.data?.reel.userId);
  const registerView = useRegisterReelView();
  const toggleLike = useToggleReelLike();

  // Build a single ordered list with the focused reel at the front when
  // appropriate. If the author has more reels we splice them in after.
  const reels = useMemo<Reel[]>(() => {
    const focusReel = focused.data?.reel;
    if (!focusReel) return [];
    const authorList = userReelsQuery.data?.pages.flatMap((p) => p.reels) ?? [];
    const dedupedAuthor = authorList.filter((r) => r.id !== focusReel.id);
    return [focusReel, ...dedupedAuthor];
  }, [focused.data, userReelsQuery.data]);

  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const viewedRef = useRef<Set<string>>(new Set());
  const [commentsReel, setCommentsReel] = useState<Reel | null>(null);
  const [shareReel, setShareReel] = useState<Reel | null>(null);

  // Set the focused reel as active on mount and whenever the URL param
  // changes. We use the first slot because the list is ordered focus-first.
  // Render-phase compare instead of an effect — see React 19 "you might not
  // need an effect" guidance — which also satisfies the
  // `react-hooks/set-state-in-effect` lint rule.
  const [prevReelId, setPrevReelId] = useState<string | undefined>(reelId);
  if (reelId !== prevReelId) {
    setPrevReelId(reelId);
    setActiveIndex(0);
  }

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

  // Keep the URL in sync as the user vertical-swipes through the author's
  // other reels — so refresh / share-link reflects the *current* clip.
  useEffect(() => {
    const reel = reels[activeIndex];
    if (!reel || reel.id === reelId) return;
    navigate(`/reels/${reel.id}`, { replace: true });
  }, [activeIndex, reels, reelId, navigate]);

  // Pull next page when nearing the end (when this came from a profile tap
  // that loaded multiple pages).
  useEffect(() => {
    if (
      reels.length > 0 &&
      activeIndex >= reels.length - 3 &&
      userReelsQuery.hasNextPage &&
      !userReelsQuery.isFetchingNextPage
    ) {
      userReelsQuery.fetchNextPage();
    }
  }, [activeIndex, reels.length, userReelsQuery]);

  const handleView = useCallback(
    (id: string) => {
      if (viewedRef.current.has(id)) return;
      viewedRef.current.add(id);
      registerView.mutate(id);
    },
    [registerView]
  );

  const handleLike = useCallback(
    (id: string) => {
      toggleLike.mutate(id);
    },
    [toggleLike]
  );
  const handleComment = useCallback((reel: Reel) => {
    setCommentsReel(reel);
  }, []);
  const handleShare = useCallback((reel: Reel) => {
    setShareReel(reel);
  }, []);

  if (focused.isPending) {
    return (
      <PageLayout showBack hideBottomNav theme="dark">
        <div className={styles.loading}>
          <Spinner /> Loading reel…
        </div>
      </PageLayout>
    );
  }

  if (focused.error || !focused.data) {
    return (
      <PageLayout showBack hideBottomNav theme="dark">
        <ErrorBox
          variant="page"
          title="Could not load reel"
          message={
            focused.error instanceof ApiError
              ? focused.error.message
              : "It may have been removed."
          }
          onRetry={() => focused.refetch()}
        />
      </PageLayout>
    );
  }

  if (reels.length === 0) {
    return (
      <PageLayout showBack hideBottomNav theme="dark">
        <div className={styles.emptyWrap}>
          <EmptyState
            icon={<Film size={36} aria-hidden />}
            title="Reel unavailable"
            description="This reel is no longer available."
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout hideHeader hideBottomNav theme="dark">
      <button
        type="button"
        className={detailStyles.backFab}
        onClick={() => navigate(-1)}
        aria-label="Go back"
      >
        ←
      </button>
      <div
        className={styles.feed}
        role="feed"
        aria-label="Reel viewer"
        aria-busy={focused.isFetching || undefined}
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
      </div>

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
