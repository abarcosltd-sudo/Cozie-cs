import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Music,
  Play,
  Search,
  Users,
} from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { ErrorBox } from "../components/ui/ErrorBox";
import { EmptyState } from "../components/ui/EmptyState";
import { useTrending, useCharts } from "../hooks/useProfile";
import { useExploreFeed } from "../hooks/useFeed";
import {
  useAvailableArtists,
  useJoinBubble,
  useLeaveBubble,
} from "../hooks/useBubbles";
import type { AvailableArtist, MusicPost, MusicTrack } from "../types/api";
import { ApiError } from "../lib/api";
import styles from "./Discover.module.css";

type DiscoverTab = "music" | "bubbles";

export default function Discover() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<DiscoverTab>("music");

  const trending = useTrending();
  const charts = useCharts();
  const explore = useExploreFeed();

  const onSearchSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      navigate(`/search-results?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handlePlay = (song: MusicTrack, queue: MusicTrack[]) => {
    navigate("/play-music", {
      state: {
        currentSong: song,
        queue,
        startFromSongId: song.id,
      },
    });
  };

  const trendingScroller = (dir: "left" | "right") => {
    const el = document.getElementById("trending-scroll");
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <PageLayout navKey="search" branded title="Discover">
      <div className={styles.searchBar}>
        <Search size={18} aria-hidden className={styles.icon} />
        <input
          type="search"
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={onSearchSubmit}
          placeholder="Search songs, artists, users…"
          aria-label="Search Cozie"
        />
      </div>

      <div className={styles.tabBar} role="tablist" aria-label="Discover sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "music"}
          onClick={() => setTab("music")}
          className={`${styles.tab} ${tab === "music" ? styles.tabActive : ""}`}
        >
          Music
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "bubbles"}
          onClick={() => setTab("bubbles")}
          className={`${styles.tab} ${tab === "bubbles" ? styles.tabActive : ""}`}
        >
          Bubbles
        </button>
      </div>

      {tab === "bubbles" ? <BubblesTab /> : null}

      {tab === "music" ? (
        <DiscoverMusic
          navigate={navigate}
          trending={trending}
          charts={charts}
          explore={explore}
          handlePlay={handlePlay}
          trendingScroller={trendingScroller}
        />
      ) : null}
    </PageLayout>
  );
}

interface DiscoverMusicProps {
  navigate: ReturnType<typeof useNavigate>;
  trending: ReturnType<typeof useTrending>;
  charts: ReturnType<typeof useCharts>;
  explore: ReturnType<typeof useExploreFeed>;
  handlePlay: (song: MusicTrack, queue: MusicTrack[]) => void;
  trendingScroller: (dir: "left" | "right") => void;
}

function DiscoverMusic({
  navigate,
  trending,
  charts,
  explore,
  handlePlay,
  trendingScroller,
}: DiscoverMusicProps) {
  return (
    <>
      <Section title="Trending now">
        {trending.isPending ? (
          <SectionLoading />
        ) : trending.error ? (
          <ErrorBox
            variant="inline"
            message={
              trending.error instanceof ApiError
                ? trending.error.message
                : "Failed to load"
            }
            onRetry={() => trending.refetch()}
          />
        ) : !trending.data?.trending?.length ? (
          <EmptyState
            icon={<Music size={32} aria-hidden />}
            title="Nothing trending yet"
          />
        ) : (
          <div className={styles.trendingWrap}>
            <div
              className={styles.trendingScroll}
              id="trending-scroll"
              role="list"
            >
              {trending.data.trending.map((song) => (
                <button
                  key={song.id}
                  type="button"
                  role="listitem"
                  className={styles.trendingCard}
                  style={{
                    backgroundImage: song.albumArtUrl
                      ? `url(${song.albumArtUrl})`
                      : undefined,
                  }}
                  onClick={() =>
                    handlePlay(song, trending.data!.trending)
                  }
                  aria-label={`Play ${song.title} by ${song.artist}`}
                >
                  {!song.albumArtUrl ? (
                    <div className={styles.trendingInner}>
                      <Music size={22} aria-hidden />
                      <div className={styles.trendingTitle}>{song.title}</div>
                      <div className={styles.trendingArtist}>{song.artist}</div>
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
            <div className={styles.scrollNav}>
              <button
                type="button"
                className={styles.scrollBtn}
                onClick={() => trendingScroller("left")}
                aria-label="Scroll trending left"
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
              <button
                type="button"
                className={styles.scrollBtn}
                onClick={() => trendingScroller("right")}
                aria-label="Scroll trending right"
              >
                <ChevronRight size={18} aria-hidden />
              </button>
            </div>
          </div>
        )}
      </Section>

      <Section title="From the community">
        {explore.isPending ? (
          <SectionLoading />
        ) : explore.error ? (
          <ErrorBox
            variant="inline"
            message={
              explore.error instanceof ApiError
                ? explore.error.message
                : "Failed to load"
            }
            onRetry={() => explore.refetch()}
          />
        ) : !explore.data?.posts?.length ? (
          <EmptyState
            icon={<Music size={32} aria-hidden />}
            title="No posts yet"
            description="Be the first to share a song."
          />
        ) : (
          <ul className={styles.exploreList}>
            {explore.data.posts.slice(0, 8).map((post: MusicPost) => (
              <li key={post.id}>
                <button
                  type="button"
                  className={styles.exploreRow}
                  onClick={() =>
                    navigate("/play-music", {
                      state: {
                        currentSong: {
                          id: post.songId,
                          title: post.songSnapshot.title,
                          artist: post.songSnapshot.artist,
                          albumArtUrl: post.songSnapshot.albumArtUrl,
                          fileUrl: post.songSnapshot.fileUrl || null,
                        },
                      },
                    })
                  }
                  aria-label={`Play ${post.songSnapshot.title} by ${post.songSnapshot.artist}`}
                >
                  <div
                    className={styles.exploreArt}
                    style={{
                      backgroundImage: post.songSnapshot.albumArtUrl
                        ? `url(${post.songSnapshot.albumArtUrl})`
                        : undefined,
                    }}
                  >
                    {!post.songSnapshot.albumArtUrl ? (
                      <Music size={18} aria-hidden />
                    ) : null}
                  </div>
                  <div className={styles.exploreMeta}>
                    <div className={styles.exploreTitle}>
                      {post.songSnapshot.title}
                    </div>
                    <div className={styles.exploreUser}>
                      <Avatar
                        src={post.userAvatarUrl}
                        name={post.userName}
                        seed={post.userId}
                        size={18}
                      />
                      <span>{post.userName}</span>
                    </div>
                    <div className={styles.exploreCounts}>
                      <span>
                        <Heart size={12} aria-hidden /> {post.likes}
                      </span>
                      <span>
                        <MessageCircle size={12} aria-hidden /> {post.comments}
                      </span>
                    </div>
                  </div>
                  <Play size={18} aria-hidden className={styles.explorePlay} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Top charts">
        {charts.isPending ? (
          <SectionLoading />
        ) : charts.error ? (
          <ErrorBox
            variant="inline"
            message={
              charts.error instanceof ApiError
                ? charts.error.message
                : "Failed to load"
            }
            onRetry={() => charts.refetch()}
          />
        ) : !charts.data?.charts?.length ? (
          <EmptyState
            icon={<Music size={32} aria-hidden />}
            title="No chart entries yet"
          />
        ) : (
          <ol className={styles.chartList}>
            {charts.data.charts.map((song, idx) => (
              <li key={song.id}>
                <button
                  type="button"
                  className={styles.chartRow}
                  onClick={() => handlePlay(song, charts.data!.charts)}
                  aria-label={`Play ${song.title}`}
                >
                  <span className={styles.chartNumber}>{song.number ?? idx + 1}</span>
                  <div
                    className={styles.chartArt}
                    style={{
                      backgroundImage: song.albumArtUrl
                        ? `url(${song.albumArtUrl})`
                        : undefined,
                    }}
                  >
                    {!song.albumArtUrl ? <Music size={18} aria-hidden /> : null}
                  </div>
                  <div className={styles.chartInfo}>
                    <div className={styles.chartTitle}>{song.title}</div>
                    <div className={styles.chartArtist}>{song.artist}</div>
                  </div>
                  <Play size={18} aria-hidden className={styles.chartPlay} />
                </button>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </>
  );
}

function BubblesTab() {
  const navigate = useNavigate();
  const list = useAvailableArtists();
  const artists = list.data?.pages.flatMap((p) => p.artists) ?? [];

  if (list.isPending) {
    return (
      <div className={styles.section}>
        <SectionLoading />
      </div>
    );
  }
  if (list.error) {
    return (
      <div className={styles.section}>
        <ErrorBox
          variant="inline"
          message={
            list.error instanceof ApiError ? list.error.message : "Failed to load"
          }
          onRetry={() => list.refetch()}
        />
      </div>
    );
  }
  if (artists.length === 0) {
    return (
      <div className={styles.section}>
        <EmptyState
          icon={<Users size={32} aria-hidden />}
          title="No artists yet"
          description="When verified artists join Cozie, they'll show up here."
        />
      </div>
    );
  }

  return (
    <Section title="Artists with bubbles">
      <ul className={styles.artistList}>
        {artists.map((artist) => (
          <li key={artist.id}>
            <ArtistRow
              artist={artist}
              onOpen={() => navigate(`/bubble/${artist.id}`)}
            />
          </li>
        ))}
      </ul>
      {list.hasNextPage ? (
        <div className={styles.discoverFooter}>
          <Button
            variant="secondary"
            size="sm"
            loading={list.isFetchingNextPage}
            onClick={() => list.fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </Section>
  );
}

interface ArtistRowProps {
  artist: AvailableArtist;
  onOpen: () => void;
}

function ArtistRow({ artist, onOpen }: ArtistRowProps) {
  const joinMut = useJoinBubble(artist.id);
  const leaveMut = useLeaveBubble(artist.id);
  const isMember = artist.bubble?.userIsMember ?? false;
  const isPending = joinMut.isPending || leaveMut.isPending;

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPending) return;
    if (isMember) leaveMut.mutate();
    else joinMut.mutate();
  };

  return (
    <div className={styles.artistCard}>
      <button type="button" className={styles.artistMain} onClick={onOpen}>
        <Avatar
          src={artist.photoURL}
          name={artist.artistName}
          seed={artist.id}
          size={52}
        />
        <div className={styles.artistBody}>
          <span className={styles.artistName}>
            {artist.artistName}
            {artist.isVerified ? (
              <Badge
                variant="verified"
                icon={<CheckCircle2 size={10} aria-hidden />}
              >
                Verified
              </Badge>
            ) : null}
          </span>
          <span className={styles.artistMeta}>
            {(artist.bubble?.memberCount ?? 0).toLocaleString()} members
          </span>
          {artist.genres.length > 0 ? (
            <span className={styles.artistGenres}>
              {artist.genres.slice(0, 3).join(" · ")}
            </span>
          ) : null}
        </div>
      </button>
      <div className={styles.artistCtaCol}>
        <Button
          variant={isMember ? "secondary" : "primary"}
          size="sm"
          loading={isPending}
          onClick={handleAction}
        >
          {isMember ? "Joined" : "Join"}
        </Button>
      </div>
    </div>
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

function SectionLoading() {
  return (
    <div className={styles.loading}>
      <Spinner /> Loading…
    </div>
  );
}
