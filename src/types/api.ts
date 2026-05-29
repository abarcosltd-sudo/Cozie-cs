/**
 * Shared shapes mirroring backend DTOs. Hand-written today; codegen from a
 * shared OpenAPI/zod schema is the natural next step.
 *
 * Conventions:
 *   - Timestamps are ISO 8601 strings when serialized over the wire.
 *   - Fields that may be absent on legacy docs are typed as optional/null
 *     to match what the API actually returns.
 */

export interface User {
  id: string;
  email: string;
  username?: string;
  fullname?: string;
  displayName?: string | null;
  bio?: string | null;
  photoURL?: string | null;
  followerCount: number;
  followingCount: number;
  visibility: "public" | "private";
  unreadNotificationCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicProfile {
  id: string;
  username: string;
  fullname: string;
  displayName: string | null;
  photoURL: string | null;
  visibility: "public" | "private";
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  albumArtUrl?: string | null;
  fileUrl?: string | null;
  duration?: number;
  genre?: string | null;
  releaseYear?: string | number | null;
  likeCount?: number;
  favoriteCount?: number;
  liked?: boolean;
}

export interface MusicPost {
  id: string;
  songId: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  createdAt: string;
  caption: string;
  songSnapshot: {
    title: string;
    artist: string;
    albumArtUrl: string | null;
    fileUrl?: string | null;
  };
  likes: number;
  comments: number;
  likedByUser: boolean;
}

export interface MusicComment {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  text: string;
  createdAt: string;
}

// ---- Reels ---------------------------------------------------------------

export type ReelStatus =
  | "pending_upload"
  | "processing"
  | "ready"
  | "errored";

/**
 * Machine-readable error codes the backend sets on `errored` reels. Stable
 * across versions so the UI can branch on them. See `REELS_FEATURE_SPEC.md`
 * section 7.1 for the full list.
 */
export type ReelErrorReason =
  | "upload_cancelled"
  | "upload_errored"
  | "processing_failed"
  | "exceeds_max_duration"
  | "no_playback_id"
  | "mux_unavailable";

export interface ReelSongSnapshot {
  title: string;
  artist: string;
  albumArtUrl: string | null;
}

export interface Reel {
  id: string;
  userId: string;
  userName: string | null;
  userAvatarUrl: string | null;
  caption: string;
  songId: string | null;
  songSnapshot: ReelSongSnapshot | null;
  status: ReelStatus;
  /** Only present when `status === "ready"`. */
  playbackId?: string;
  /** HLS manifest URL — only present when `status === "ready"`. */
  playbackUrl?: string;
  /** Mux-derived thumbnail — only present when `status === "ready"`. */
  thumbnailUrl?: string | null;
  /** Only present when `status === "ready"`. */
  durationMs?: number;
  /** Only present when `status === "ready"`. e.g. "9:16". */
  aspectRatio?: string | null;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  likedByUser: boolean;
  /** Only present when `status === "errored"`. */
  errorReason?: ReelErrorReason;
  /** Only present when `status === "errored"`. Human-readable. */
  errorMessage?: string;
  createdAt: string;
}

export interface ReelComment {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  text: string;
  createdAt: string;
}

export interface ReelFeedResponse {
  reels: Reel[];
  nextCursor: string | null;
  count: number;
}

export interface ReelCommentsResponse {
  comments: ReelComment[];
  nextCursor: string | null;
  count: number;
}

export interface CreateReelResponse {
  reelId: string;
  uploadId: string;
  uploadUrl: string;
  /** ISO timestamp. The PUT must complete before this — Mux rejects late. */
  uploadExpiresAt: string;
  message?: string;
}

export interface SingleReelResponse {
  reel: Reel;
}

export interface ToggleReelLikeResponse {
  liked: boolean;
  likeCount: number;
  message?: string;
}

export interface RegisterReelViewResponse {
  viewCount: number;
  firstView: boolean;
}

export interface ShareReelResponse {
  shareCount: number;
}

export interface AddReelCommentResponse {
  commentId: string;
  comment: ReelComment;
}

export interface DeleteReelResponse {
  deleted: true;
  reelId: string;
  message?: string;
}

export interface Conversation {
  id: string;
  otherUserId: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  avatar: string | null;
  isOnline: boolean;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
  isMusic?: boolean;
  musicTitle?: string;
  musicArtist?: string;
  musicUrl?: string;
}

export type NotificationType =
  | "follow"
  | "post_like"
  | "post_comment"
  | "song_like"
  | "reel_like"
  | "reel_comment";

export interface AppNotification {
  id: string;
  type: NotificationType;
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  targetType: "user" | "post" | "song" | "comment" | "message" | "reel";
  targetId: string;
  snapshot?: {
    songTitle?: string | null;
    songArtist?: string | null;
    albumArtUrl?: string | null;
    commentText?: string | null;
    commentId?: string | null;
    postCaption?: string | null;
    /** Reel-specific snapshot field — auto-thumbnail derived by Mux. */
    thumbnailUrl?: string | null;
  };
  read: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedListResponse<T> {
  count: number;
  nextCursor: string | null;
  // The data key is named after the resource (followers / following /
  // notifications). Callers should destructure by their specific key.
  [resourceKey: string]: T[] | number | string | null;
}

export interface FollowStatus {
  userId: string;
  isFollowing: boolean;
  isFollowedBy: boolean;
  isSelf: boolean;
  followerCount: number;
  followingCount: number;
  visibility: "public" | "private";
}

export interface AuthLoginResponse {
  token: string;
  user: User;
}

export interface AuthSignupResponse {
  userId: string;
  message: string;
  emailSent?: boolean;
}

export interface AuthVerifyOtpResponse {
  token: string;
  user: User;
}
