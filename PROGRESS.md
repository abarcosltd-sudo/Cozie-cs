# Cozie Frontend — Progress Checklist

A granular tracking document mapping the `Cozie-cs/` frontend implementation against the Cozie SRS. Tick items off as they're completed.

**Legend**
- `[x]` Implemented and wired up in code.
- `[~]` Partially done — needs work (see note).
- `[ ]` Not started.

**Snapshot:** roughly **24%** of frontend scope from the SRS (52 of 213 granular items checked).

> **Architecture milestone (2026-05-25):** Tier 1–4 refactor shipped — see `## Frontend refactor — 2026-05-25` at the bottom of this file.
>
> **Feature milestone (2026-05-28):** Reels frontend slice shipped (hls.js player, vertical feed, Mux direct upload, engagement, profile tab, deep-link viewer, notification routing) — see `## Reels frontend slice — 2026-05-28` at the bottom of this file.

> Each bar is 10 cells wide. When you tick or untick an item below, also update the count and bar in the matching row here so this dashboard stays in sync.

## Progress at a glance

| §  | Section                          | Progress                  | Done   |
|----|----------------------------------|---------------------------|--------|
| —  | **Overall**                      | `▰▰▱▱▱▱▱▱▱▱`              | 52/213 |
| 1  | Project infrastructure           | `▰▰▰▰▰▱▱▱▱▱`              | 12/26  |
| 2  | Splash & onboarding              | `▰▰▰▰▰▱▱▱▱▱`              | 7/13   |
| 3  | Home feed                        | `▰▰▰▱▱▱▱▱▱▱`              | 5/17   |
| 4  | Discover                         | `▰▰▰▰▱▱▱▱▱▱`              | 4/10   |
| 5  | Music playback                   | `▰▱▱▱▱▱▱▱▱▱`              | 1/11   |
| 6  | Upload, add & share music        | `▰▰▰▱▱▱▱▱▱▱`              | 2/7    |
| 7  | User profile                     | `▰▰▰▱▱▱▱▱▱▱`              | 3/12   |
| 8  | Messages (DMs)                   | `▰▰▰▰▱▱▱▱▱▱`              | 7/18   |
| 9  | Settings & account management    | `▱▱▱▱▱▱▱▱▱▱`              | 0/10   |
| 10 | Follow / social graph            | `▱▱▱▱▱▱▱▱▱▱`              | 0/5    |
| 11 | Artist Communities ("Bubbles")   | `▱▱▱▱▱▱▱▱▱▱`              | 0/5    |
| 12 | Battle Rooms                     | `▱▱▱▱▱▱▱▱▱▱`              | 0/9    |
| 13 | Matchmaking                      | `▱▱▱▱▱▱▱▱▱▱`              | 0/6    |
| 14 | Reels                            | `▰▰▰▰▰▰▰▰▰▰`              | 5/5    |
| 15 | Premium tier UI                  | `▱▱▱▱▱▱▱▱▱▱`              | 0/11   |
| 16 | Notifications                    | `▱▱▱▱▱▱▱▱▱▱`              | 0/4    |
| 17 | Coming-soon placeholders         | `▰▰▰▰▰▰▰▰▰▱`              | 6/7    |
| 18 | Non-functional / cross-cutting   | `▱▱▱▱▱▱▱▱▱▱`              | 0/24   |
| 19 | Tech debt & cleanup              | `▱▱▱▱▱▱▱▱▱▱`              | 0/13   |

---

## 1. Project infrastructure

- [x] Vite 7 + React 19 + TypeScript scaffold
- [x] React Router 7 with all current pages registered (`src/App.tsx`)
- [x] Axios + native `fetch` available
- [x] Firebase Web SDK initialised (`firebase.ts`)
- [x] socket.io-client installed (`socket.ts`) — **not actually used in any page**
- [x] ESLint flat config (`eslint.config.js`)
- [x] TypeScript strict project refs (`tsconfig.app.json`, `tsconfig.node.json`)
- [x] React Compiler enabled (`vite.config.ts`)
- [x] Dockerfile (multi-stage → nginx) + `nginx.conf` (SPA fallback, hashed-asset caching)
- [x] `.dockerignore`
- [x] `README.md` with build/run instructions
- [x] `vercel.json` for Vercel deploys
- [ ] Centralised API client (axios instance with base URL + interceptors)
- [ ] `VITE_API_URL` actually used (currently hard-coded `https://cozie-kohl.vercel.app` in many pages — see §16)
- [ ] `.env.example` for `VITE_*` keys
- [ ] Global auth context / state management (Zustand / Redux / Context)
- [ ] Global toast / notification system
- [ ] Protected route wrapper (redirect to /login if no token)
- [ ] Error boundary
- [ ] Loading skeletons / shared `<Loader />` component
- [ ] Component library / design system (none yet — every page rolls its own CSS)
- [ ] Storybook for components
- [ ] Unit / component tests (Vitest + React Testing Library)
- [ ] E2E tests (Playwright / Cypress)
- [ ] CI pipeline (build, lint, type-check, test)
- [ ] Bundle-size budget / analyse

---

## 2. Splash & onboarding

- [x] Splash screen (`Pages/splash.tsx`)
- [x] Login page (`Pages/login.tsx`)
- [x] Signup page (`Pages/signup.tsx`)
- [x] OTP verification page (`Pages/verification.tsx`)
- [x] Genre preference picker (`Pages/Preference.tsx`)
- [x] Profile setup (`Pages/ProfileSetup.tsx`)
- [x] Connect-music page (`Pages/ConnectMusic.tsx`)
- [ ] "Forgot password" flow
- [ ] Resend-OTP UI
- [ ] Social login buttons (Google / Apple / Spotify)
- [ ] Onboarding consent screen (listening data, marketing, third-party sharing)
- [ ] Terms-of-service / privacy-policy acceptance
- [ ] First-time tutorial / tooltips (SRS 3.3.4)

---

## 3. Home feed (SRS alg-step 3)

- [x] Feed page (`Pages/HomeFeed.tsx`) — fetches `/api/posts/feed`
- [x] Like / unlike a post (mirrors to backend)
- [x] Comments modal (list + add)
- [x] Time-ago formatting
- [x] Album art / fallback icon
- [ ] Personalised ranking (depends on backend — currently chronological)
- [ ] Infinite scroll / pagination
- [ ] Pull-to-refresh
- [ ] Post share button → actually posts to external platforms
- [ ] Repost / quote-post UI
- [ ] Save / bookmark UI
- [ ] Audio comments UI (record + playback)
- [ ] Hashtag rendering and clickable mentions
- [ ] Empty-state and error-state polish
- [ ] Optimistic UI for like / comment

---

## 4. Discover (SRS 3.2.1)

- [x] Discover page (`Pages/Discover.tsx`)
- [x] Trending carousel from `/api/music/trending`
- [x] Top charts list from `/api/music/charts`
- [x] Search bar (calls `/api/music/search`)
- [ ] Search results page (separate route, with filters)
- [ ] Search filters (genre, year, mood, artist)
- [ ] Search history / suggestions
- [ ] "Made for you" / "Because you played X" rails (needs backend recommender)
- [ ] Genre browser

---

## 5. Music playback

- [x] PlayMusic page (`Pages/PlayMusic.tsx`) — single-track player UI
- [ ] Persistent / global mini-player across routes
- [ ] Play queue management
- [ ] Shuffle / repeat controls
- [ ] Scrub bar with live position
- [ ] Volume control
- [ ] Cast / AirPlay / output device picker
- [ ] Lyrics view
- [ ] Lock-screen / media-session API integration (mobile)
- [ ] Offline downloads (SRS 3.2.1)
- [ ] Play-event analytics emitted to backend

---

## 6. Upload, add & share music

- [x] AddMusic page (`Pages/AddMusic.tsx`) — full metadata form + audio + album art upload via signed URLs
- [x] ShareMusic page (`Pages/ShareMusic.tsx`) — share a song to feed
- [ ] Drag-and-drop upload
- [ ] Audio waveform preview before upload
- [ ] Edit / delete uploaded music UI
- [ ] Upload progress + resumable uploads
- [ ] Validation of file size / type before signed-URL request

---

## 7. User profile

- [x] UserProfile page (`Pages/UserProfile.tsx`) — fetches `/api/users/profile`, shows displayName, username, photo
- [x] Tabs scaffold (Posts / etc.)
- [x] Grid posts placeholder
- [ ] Real posts loaded into the grid (currently hard-coded gradient placeholders)
- [ ] Followers / Following counts and lists (routes go to `ComingSoon`)
- [ ] Edit profile page (route goes to `ComingSoon`)
- [ ] Profile photo / cover upload UI
- [ ] Other-user profile view (`/profile/:userId`)
- [ ] Follow / unfollow button
- [ ] Block / mute / report user
- [ ] Premium badge / username styling
- [ ] Profile-level privacy controls

---

## 8. Messages (DMs)

- [x] Messages page (`Pages/Messages.tsx`)
- [x] Conversation list
- [x] Active chat view
- [x] Send text message
- [x] Send music card (share song into DM)
- [x] Unread counts shown
- [x] Available-users modal (start new chat)
- [ ] Real-time updates (socket import exists but is commented out — falls back to manual refresh)
- [ ] Typing indicator UI
- [ ] Read receipts shown to sender
- [ ] Voice / audio messages
- [ ] Image / file attachments
- [ ] Group chats
- [ ] Message search
- [ ] DM-privacy setting UI ("who can message me")
- [ ] Block / report from inside a thread
- [ ] Message pagination / load older

---

## 9. Settings & account management

- [ ] Settings page (route `/settings` goes to `ComingSoon`)
- [ ] Edit profile page (route `/edit-profile` goes to `ComingSoon`)
- [ ] Notification preferences UI
- [ ] Privacy / consent toggles
- [ ] Theme switcher (light / dark)
- [ ] Language picker (i18n)
- [ ] Connected-accounts (Spotify, Last.fm, Apple Music) management
- [ ] Change password
- [ ] Delete account (GDPR / NDPR)
- [ ] Download my data

---

## 10. Follow / social graph

- [ ] Follow button on profiles
- [ ] Followers list page (route exists, goes to `ComingSoon`)
- [ ] Following list page (route exists, goes to `ComingSoon`)
- [ ] Suggested users component
- [ ] Follow notifications surface

---

## 11. Artist Communities / "Bubbles" (SRS alg-step 4)

- [ ] Communities tab in nav
- [ ] Bubble list page (user's auto-joined communities)
- [ ] Bubble detail page (community feed)
- [ ] Post into a community UI
- [ ] Community-scoped notifications surface

---

## 12. Battle Rooms (SRS alg-step 6)

- [ ] Battle Rooms tab in nav
- [ ] Browse / discover rooms page
- [ ] Create-room form
- [ ] In-room real-time UI (live messages, votes)
- [ ] Observe-only mode for free tier (gated UI)
- [ ] Interact mode for premium tier
- [ ] Artist Challenge Room variant (artist-vs-artist layout)
- [ ] Ticket purchase flow for Artist Challenge Rooms
- [ ] Room moderation UI (kick, mute, report)

---

## 13. Music-taste Matchmaking (Premium, alg-step 7)

- [ ] Matchmaking entry point in nav (premium-only)
- [ ] Suggested matches list / swipe deck
- [ ] Compatibility score visualisation
- [ ] Accept / decline match
- [ ] Mutual-interest notification UI
- [ ] Filter / preference controls (geography, age, online)

---

## 14. Reels (SRS alg-step 8)

- [x] Reels tab (`src/components/layout/BottomNav.tsx`, route `/reels`)
- [x] Vertical-swipe reel player (`src/pages/Reels.tsx` + `src/components/reels/ReelPlayer.tsx`, hls.js + windowed 5-instance list, view-ping after 3s)
- [x] Record / upload reel UI (`src/pages/ComposeReel.tsx`, Mux direct-upload via `src/lib/upload.ts`, persistent `<UploadToast>`)
- [x] Reel likes / comments / shares UI (optimistic like via `useToggleReelLike`, `ReelCommentsSheet`, `ReelShareSheet` with Web Share + copy link)
- [x] Reel discovery feed (`useInfiniteReelsDiscover` + Following/Discover segmented control)

---

## 15. Premium tier UI (SRS 3.2)

- [ ] Subscribe / upgrade screen with plan comparison
- [ ] Payment-method capture (Stripe / Paystack / Flutterwave widget)
- [ ] Premium badge on usernames + posts
- [ ] Gold / grey username font picker (premium)
- [ ] Custom wallpaper picker (premium)
- [ ] Ad-free experience toggle
- [ ] Audio-comments UI (premium)
- [ ] AI music creation entry point (Udio / Korin / Beatoven)
- [ ] Manage subscription page (renew, cancel, change plan)
- [ ] Receipts / billing history

---

## 16. Notifications

- [ ] In-app notification centre
- [ ] FCM push-token registration on login
- [ ] Notification banners / toasts
- [ ] Per-category notification preferences UI

---

## 17. Coming-soon placeholders (current state)

- [x] `Pages/ComingSoon.tsx` exists and is reused by:
  - [x] `/followers`
  - [x] `/following`
  - [x] `/edit-profile`
  - [x] `/coming-soon`
  - [x] `/settings`
- [ ] Replace each placeholder with real implementation (covered by sections above)

---

## 18. Non-functional / cross-cutting

### Usability (SRS 3.3.4)
- [ ] Consistent design system across pages (currently each page has its own CSS file)
- [ ] Responsive layout audit (mobile, tablet, desktop)
- [ ] First-run tutorial / tooltips
- [ ] Empty states designed for every list view

### Accessibility (SRS 3.3.4)
- [ ] Keyboard navigation audit on every interactive element
- [ ] ARIA roles / labels on icon-only buttons
- [ ] Focus rings + visible focus order
- [ ] Colour contrast audit (WCAG 2.1 AA)
- [ ] Screen reader pass (NVDA / VoiceOver)
- [ ] `prefers-reduced-motion` honoured for animations

### Internationalisation (SRS 3.3.4)
- [ ] i18n framework (react-i18next / FormatJS)
- [ ] String extraction for all UI text
- [ ] Language picker
- [ ] RTL layout support

### Performance (SRS 3.3.1)
- [ ] Route-level code splitting (`React.lazy` + `Suspense`)
- [ ] Image optimisation (responsive `srcset`, lazy loading)
- [ ] Audio prefetch / preload strategy
- [ ] Lighthouse audit pass

### Security
- [ ] JWT stored in HTTP-only cookie instead of localStorage (or accept the trade-off explicitly)
- [ ] CSRF posture documented
- [ ] Content Security Policy headers via nginx
- [ ] No secrets in client bundle (review `VITE_*` usage)

### Telemetry
- [ ] Client analytics SDK (PostHog / GA4)
- [ ] Error reporting (Sentry)

---

## 19. Tech debt & cleanup (discovered during audit)

- [ ] Hard-coded backend URL `https://cozie-kohl.vercel.app` in:
  - `src/App.tsx`
  - `Pages/HomeFeed.tsx`
  - `Pages/UserProfile.tsx`
  - `Pages/Discover.tsx`
  - `Pages/Messages.tsx`
  - (likely others) — should all use `import.meta.env.VITE_API_URL`
- [ ] `socket.ts` is imported but never used in any page; either wire up real-time or delete
- [ ] Inline `<style>` injection at the bottom of `src/App.tsx` (the `@keyframes spin` block) — should live in a CSS file
- [ ] Large commented-out style block at the bottom of `src/App.tsx` — should be deleted
- [ ] Per-page CSS files duplicate styling (no shared tokens / variables)
- [ ] `package.json` `"name": "npm"` — should be `"cozie-cs"` or similar
- [ ] `Pages/` folder is at project root (sibling of `src/`) — convention is for everything to live under `src/`; consider moving
- [ ] Casing of page filenames is inconsistent (`login.tsx`, `signup.tsx`, `splash.tsx` lowercase; `HomeFeed.tsx`, `Discover.tsx`, `UserProfile.tsx` PascalCase) — pick one
- [ ] CSS filenames similarly inconsistent (`HomeFeed.css` vs `messages.css` vs `addmusic.css`)
- [ ] No path alias (`@/...`) — many `../../` imports
- [ ] No global API error handling — every page reinvents error states
- [ ] No central place for `localStorage.getItem('token')` access — should be in an auth hook
- [ ] `vercel.json` deploys assume static-only — confirm this still matches the Docker / nginx production model

---

## Frontend refactor — 2026-05-25

End-to-end refactor against the senior-engineer review. All four tiers landed; `tsc --noEmit`, `npm run lint`, and `npm run build` are clean. Production bundle: **394 KB JS / 124 KB gzipped, 40 KB CSS / 8 KB gzipped** (down from the firebase+axios baseline).

### Tier 1 — Foundations ✅
- [x] Moved `Pages/` → `src/pages/` and fixed `tsconfig.app.json` scope; `tsc --noEmit` is green.
- [x] `src/lib/api.ts` — single `fetch` client with `VITE_API_URL`, bearer injection, `{success, data, error}` envelope unwrapping, `ApiError`, global 401 handler.
- [x] `src/contexts/AuthContext.tsx` + `useAuth()` — single source of truth for token + current user; hydrates from `/api/users/me` on boot; localStorage-synced across tabs.
- [x] `<ProtectedRoute>` + `<PublicOnlyRoute>` route wrappers mounted in `App.tsx`.
- [x] Stripped dead deps: deleted `firebase.ts`, `socket.ts`, `axios`; removed `firebase` + `axios` from `package.json`.

### Tier 2 — Productivity multipliers ✅
- [x] `@tanstack/react-query` wired in `main.tsx` via `QueryClientProvider`; per-feature hooks in `src/hooks/` (`useFeed`, `useProfile`, `useFollow`, `useMessages`, `useNotifications`).
- [x] Shared UI primitives in `src/components/ui/` — `Button`, `Avatar`, `Modal`, `Spinner`, `ErrorBox`, `EmptyState` (CSS Modules).
- [x] Layout primitives in `src/components/layout/` — `Header`, `BottomNav`, `PageLayout` (CSS Modules).
- [x] Shared `src/types/api.ts` — `User`, `MusicTrack`, `MusicPost`, `Comment`, `Conversation`, `Message`, `Notification`.
- [x] CSS Modules adopted across every page; all per-page global `.css` files deleted.

### Tier 3 — Connect the backend ✅
- [x] Notifications: bell badge in `Header` polls `/api/notifications/unread-count` every 30s; `/notifications` page with mark-all-read, per-item dismiss, infinite list.
- [x] Followers / Following pages backed by real API; Follow/Unfollow button on `UserProfile`.
- [x] `/search-results` route wired to `GET /api/music/search?q=…`.
- [x] Real OTP resend handler in `verification.tsx`; fake OAuth stubs removed from `ConnectMusic` and `login` (replaced with "coming soon" surfaces).
- [x] `Messages.tsx`: conversation-id vs userId confusion fixed; sender alignment uses `useAuth().user.id`.

### Tier 4 — Quality, polish, a11y ✅
- [x] Root `ErrorBoundary` with Sentry-ready hook in `main.tsx`.
- [x] A11y pass: clickable `<div>`s → `<button>`, ARIA labels, `role="alert"` / `aria-live` on error/success surfaces, focus management on OTP + modal flows.
- [x] `nginx.conf` security headers: HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP/CORP.
- [x] Emoji icons replaced with `lucide-react` across all pages.
- [x] Real favicon (`public/cozie.svg`) + `public/manifest.webmanifest` + `<meta>` tags (`theme-color`, `viewport-fit=cover`, description).

### Verification
- `npx tsc --noEmit` → exit 0
- `npm run lint` → exit 0
- `npm run build` → 1710 modules, 394 KB JS / 124 KB gzipped, 40 KB CSS / 8 KB gzipped

---

## Backend ↔ frontend audit — 2026-05-25

End-to-end audit of every backend route against every frontend call site. Three bugs and two missing UI surfaces found and fixed.

### Bugs fixed (frontend was calling backend routes that didn't exist)
- [x] `GET /api/users/:userId/profile` — public profile by id. The `usePublicProfile` hook has been calling this since the refactor; backend now exposes it (`userController.getPublicProfile` → `userService.getProfile`). Visiting another user's profile no longer 404s.
- [x] `GET /api/users/:userId/posts` — list a user's posts with cursor pagination. Backed by new `musicPostRepository.listByUserId` + `musicPostService.listByUser`. Powers the profile "Posts" tab.
- [x] `GET /api/users/:userId/liked-songs` — list a user's liked songs. Reuses existing `musicService.listUserLikedSongs` (already viewer-agnostic). Powers the profile "Liked" tab.

### Missing UI surfaces wired
- [x] `DELETE /api/messages/:messageId` — `useDeleteMessage` hook with optimistic remove + trash-icon affordance on sent bubbles in `Messages.tsx`. Confirms with the user before firing.
- [x] `GET /api/posts/explore` — `useExploreFeed` was already defined but never consumed. Surfaced as a "From the community" section in `Discover`, between trending and charts.

### Backend routes added
- `GET /api/users/:userId/profile` (auth)
- `GET /api/users/:userId/posts?cursor&limit` (auth, cursor pagination)
- `GET /api/users/:userId/liked-songs` (auth)

### Backend code touched
- `routes/userRoutes.js` — three new route registrations.
- `controllers/userController.js` — `getPublicProfile`, `getUserPosts`, `getUserLikedSongs`.
- `services/musicPostService.js` — `listByUser(authorId, viewerId, { cursor, limit })`.
- `repositories/musicPostRepository.js` — `listByUserId(userId, { cursor, limit })`.
- `validators/userValidators.js` — `userResourceListQuerySchema` for cursor+limit.

### Frontend code touched
- `hooks/useMessages.ts` — added `useDeleteMessage` with optimistic cache update.
- `pages/Messages.tsx` — delete affordance per own bubble, threads the conversation id through `useDeleteMessage`.
- `pages/Messages.module.css` — new `.bubbleMeta`, `.bubbleAction` styles.
- `pages/Discover.tsx` — added "From the community" section consuming `useExploreFeed`.
- `pages/Discover.module.css` — `.exploreList`, `.exploreRow`, `.exploreMeta`, `.exploreCounts`.

### Backend endpoints intentionally left unconsumed (defer)
- `GET /api/users/favorites` — list current user's favorites (no UI yet; PlayMusic uses per-song check)
- `GET /api/music/:songId` — fetch song by id (PlayMusic uses router state today; works without it)
- `GET /api/music/:songId/likes` — list of users who liked a song (no UI for this)
- `GET /api/music/liked` — self liked-songs (covered by the new `/api/users/:userId/liked-songs` for any user)

### Verification (post-audit)
- `npx tsc --noEmit` → exit 0
- `npm run lint` → exit 0
- `npm run build` → 1710 modules, 397.81 KB JS / 124.73 KB gz, 41.40 KB CSS / 8.28 KB gz
- `node --check` on every touched backend file → all parse

---

## Reels frontend slice — 2026-05-28

End-to-end client side of the Reels feature against the 11-endpoint backend that shipped on 2026-05-26 (see `Cozie/REELS_FEATURE_SPEC.md` + `Cozie/PROGRESS.md` "Reels feature ship — 2026-05-26"). Implements the spec end-to-end: vertical Discover/Following feed, Mux direct-upload pipeline, like/comment/view/share engagement, profile Reels tab, deep-link viewer, two new notification types.

Planned in [`reels_frontend_slice_9f1aafda.plan.md`](../.cursor/plans/reels_frontend_slice_9f1aafda.plan.md) and shipped across four reviewable slices (F1 → F4) in a single branch.

### F1 — Infra + Discover ✅
- [x] `hls.js` dependency added; `src/lib/hls.ts` attaches native HLS on Safari, falls back to `hls.js` everywhere else; explicit `detach()` cleanup so swiping doesn't leak buffers.
- [x] `src/types/api.ts` extended with `Reel`, `ReelStatus`, `ReelErrorReason`, `ReelComment`, `ReelFeedResponse`, `ReelCommentsResponse`, `CreateReelResponse`, `SingleReelResponse`, `ToggleReelLikeResponse`, `RegisterReelViewResponse`, `ShareReelResponse`, `AddReelCommentResponse`. `NotificationType` widened with `"reel_like" | "reel_comment"`; `targetType` widened with `"reel"`.
- [x] `src/hooks/useReels.ts` — full hook surface: `useInfiniteReelsDiscover`, `useFollowingReelsFeed`, `useUserReels`, `useReel` (polls every 5 s while status ≠ `ready`), `useReelComments` (cursor-paginated), `useToggleReelLike` (optimistic across discover + following + by-user + single caches), `useAddReelComment`, `useRegisterReelView` (fire-and-forget), `useShareReel` (optimistic shareCount bump), `useCreateReel`.
- [x] `src/components/reels/ReelPlayer.tsx` — autoplay-muted-when-active, visibility-pause via document visibility + IntersectionObserver, loop, 3 s view-ping callback driven by `timeupdate` deltas (immune to seek/loop wrap), `navigator.connection.saveData` respect (poster-only / tap-to-play).
- [x] `src/components/reels/ReelCard.tsx` + `ReelActionRail.tsx` — memoized card, author overlay, song chip, right rail with like/comment/share counts (K/M formatting).
- [x] `src/pages/Reels.tsx` — windowed render (active + 2 above + 2 below = 5 player instances max per spec §5.3), scroll-snap-y, page-scoped view-ping dedup `Set<string>`, auto-pagination when nearing the end.
- [x] `src/pages/Reels.module.css` (full-bleed black background, segmented control float, FAB compose button) + route wired behind `<ProtectedRoute>`.
- [x] `src/components/layout/PageLayout.tsx` extended with `theme="dark"` prop; dark variant kills the 640 px max-width and white background so the player can go edge-to-edge.
- [x] `src/components/layout/BottomNav.tsx` reworked to Default A: center "Create" is now an action button that opens `<CreateSheet>` (pick between Share music / New reel) instead of a route; Reels tab added between Create and Profile; Messages moved to a header icon next to the bell.

### F2 — Compose + upload pipeline ✅
- [x] `src/lib/upload.ts` — `putVideoWithProgress(url, file, { signal, onProgress })`. XHR-based because Fetch can't surface upload progress. Cancellable via `AbortSignal`; rejects with a typed `UploadError` (`aborted` flag set for user cancels).
- [x] `src/contexts/UploadContext.tsx` — global `<UploadProvider>` mounted at the App root; single-upload state machine (`idle → queued → uploading → processing → ready | errored`) with object-URL preview thumbnails, AbortController cancellation, and polling of `/api/reels/:reelId` after the PUT completes (5 s → 30 s after 60 s elapsed). Feeds + single-reel caches are bumped on `ready`.
- [x] `src/components/reels/UploadToast.tsx` — persistent floating chip that survives navigation; shows progress %, processing spinner, success "View" CTA, errored "Retry" CTA, and a cancel/dismiss button gated on phase. Mounted in `App.tsx` so every route renders it.
- [x] `src/pages/ComposeReel.tsx` — file pick (with `capture="user"` for in-browser camera), in-browser validation (MIME `video/*`, ≤ 50 MB, ≤ 60 s), object-URL `<video controls>` preview, caption (300 char cap) + song picker (mirrors `ShareMusic.tsx` debounced search). Submit hands off to `useCreateReel` → `useUpload().start()` then navigates back to `/reels` immediately.

### F3 — Engagement ✅
- [x] Heart wired through `useToggleReelLike`; optimistic across every cached copy of the reel (helper `patchReelInCaches` traverses discover infinite query, following query, all by-user infinite queries, single-reel query).
- [x] `src/components/reels/ReelCommentsSheet.tsx` — cursor-paginated comments (existing post `CommentsModal` is non-paginated; reel sheet ships paginated from day one per plan open-decision #3), reuses the existing `<Modal>` primitive, Enter-to-post / Shift+Enter for newline.
- [x] `src/components/reels/ReelShareSheet.tsx` — Web Share API when available + clipboard fallback (with legacy `document.execCommand("copy")` for browsers that gate the async API). Each row fires `POST /api/reels/:reelId/share` with the platform tag before performing the action (matches Instagram's optimistic-on-tap behaviour). DM row deferred per plan open-decision #2 until the DM picker is extracted as a standalone component.

### F4 — Following + Profile + Notifications ✅
- [x] Following/Discover segmented control on `Reels.tsx` (Discover infinite, Following fixed top-N since backend doesn't expose a cursor for the fan-out feed); empty-state copy per spec §5.3.
- [x] `src/pages/UserProfile.tsx` gained a fourth tab "Reels" between Posts and Playlists; renders a 3-column thumbnail grid from `useUserReels(userId)` with a small play+view-count badge per tile. Tapping a tile navigates to `/reels/:reelId`.
- [x] `src/pages/ReelDetail.tsx` — opens a single reel for `/reels/:reelId`. Once the focused reel resolves, fetches the author's `useUserReels` and concatenates the focused reel at the front so the windowed list code stays uniform. Vertical swipe through the rest of the author's catalogue, URL kept in sync with `replace: true` as the active reel changes (so refresh / copy-link reflect the current clip).
- [x] `src/pages/Notifications.tsx` extended: `describe()`, `iconFor()`, `destination()` switches now cover `reel_like` / `reel_comment`; `targetType: "reel"` maps to `/reels/:targetId`. `useNotifications.ts` needed no structural change — the widened type union flows through automatically.

### Files added
- `src/lib/hls.ts`
- `src/lib/upload.ts`
- `src/hooks/useReels.ts`
- `src/contexts/UploadContext.tsx`
- `src/components/reels/ReelPlayer.tsx` (+ `.module.css`)
- `src/components/reels/ReelCard.tsx` (+ `.module.css`)
- `src/components/reels/ReelActionRail.tsx` (+ `.module.css`)
- `src/components/reels/ReelCommentsSheet.tsx` (+ `.module.css`)
- `src/components/reels/ReelShareSheet.tsx` (+ `.module.css`)
- `src/components/reels/CreateSheet.tsx` (+ `.module.css`)
- `src/components/reels/UploadToast.tsx` (+ `.module.css`)
- `src/pages/Reels.tsx` (+ `.module.css`)
- `src/pages/ComposeReel.tsx` (+ `.module.css`)
- `src/pages/ReelDetail.tsx` (+ `.module.css`)

### Files modified
- `package.json` — added `hls.js` dependency.
- `src/types/api.ts` — full Reel type surface; widened notification unions.
- `src/App.tsx` — three new routes; wraps the entire app in `<UploadProvider>`; mounts global `<UploadToast>`.
- `src/components/layout/BottomNav.tsx` (+ `.module.css`) — center "Create" action + Reels tab + 5-tab layout.
- `src/components/layout/Header.tsx` — new Messages icon (demoted from bottom nav).
- `src/components/layout/PageLayout.tsx` (+ `.module.css`) — `theme="dark"` prop.
- `src/pages/UserProfile.tsx` (+ `.module.css`) — `"reels"` tab + `ReelsGrid` component.
- `src/pages/Notifications.tsx` — describe / iconFor / destination extensions.

### Open decisions resolved
1. **Bottom nav layout** → Default A (5 tabs, Messages → header icon).
2. **DM share row** → omitted in F3; reintroduce when the DM picker is extracted.
3. **Comments pagination** → reel sheet ships paginated from day one (cursor-based via `useInfiniteQuery`).

### Open decisions for production
- **CSP**: `nginx.conf` needed to add `https://stream.mux.com`, `https://image.mux.com`, and `https://storage.googleapis.com` to `connect-src` — done in this slice.
- **Bundle**: hls.js adds ~145 KB minified / ~40 KB gz. The three reel routes (`/reels`, `/reels/:reelId`, `/compose/reel`) are now `React.lazy`-split, so the hls.js cost and the reel runtime only download when the user actually navigates into the feature. Cold-load main bundle dropped from **580.46 → 420.88 KB raw / 180.20 → 131.76 KB gzipped** (≈ 48 KB gz off the critical path). The shared reel chunk is 537.44 KB / 168.16 KB gzipped and is fetched on first reel navigation, then cached.

### Out of scope (carry-over to next slice)
- Reel deletion (depends on backend `DELETE /api/reels/:reelId`, currently unimplemented).
- Edit-after-publish.
- Hashtag / mention parsing inside captions.
- FCM push notifications (web push registration).
- In-browser trim / edit before upload.
- Subtitles / caption tracks.
- Data-saver preferences panel (current behaviour: respect `navigator.connection.saveData` automatically).

### Verification (post-slice)
- `npx tsc --noEmit` → exit 0
- `npm run lint` (scoped to `src/`) → no errors, no warnings in the new files. Pre-existing lint debt in `Pages/*` (legacy folder, ignored) untouched.
- `npm run build` → 1736 modules. Critical-path `index-*.js` is **420.88 KB / 131.76 KB gzipped**; three reel routes ship as their own chunks (`Reels-*.js` 6.02 KB, `ReelDetail-*.js` 4.54 KB, `ComposeReel-*.js` 6.21 KB) plus a shared `Reels.module-*.js` of 537.44 KB / 168.16 KB gzipped (hls.js + ReelPlayer/Card/Rail + `useReels`) that loads on first reel navigation.

### Follow-up fixes (2026-05-28, same day)
- **🔴 Notification text**: `Notifications.tsx` `describe("reel_like")` now reads `snapshot.songTitle` instead of the never-set `postCaption`, matching `Cozie/services/notificationService.js#emitReelLike`. Wording: `liked your reel featuring "<song>"`.
- **🔴 UploadContext race**: replaced the stale-closure `current` guard inside `start()` with a `useRef<boolean>` in-flight flag set on entry and cleared on every terminal transition (ready / errored / 404 / abort / unmount). `startPolling` is now a proper `useCallback` so `start`'s dep list is honest and the `eslint-disable` directive is gone. Provider unmount now `abort()`s the in-flight upload before cleanup so a logout-mid-upload stops pushing bytes to Mux.
- **🔴 Like-button burst**: `useToggleReelLike` no longer snapshots per mutation. A per-reel `LikeBurst` (snapshot + counter + errored flag) is created on the first in-flight toggle and cleared only when the last toggle in the burst settles. Rapid double-taps now share one pre-burst snapshot, so a failed mutation in the middle of a burst can no longer roll back to an already-optimistically-mutated cache.
- **🟡 Code-split**: `Reels`, `ReelDetail`, `ComposeReel` are now `React.lazy` behind a top-level `<Suspense fallback={<FullPageSpinner />}>` in `App.tsx`. Cold-load gzip savings: ~48 KB on the critical path (see bundle table above).

### Production hotfixes (2026-05-28, late same day)
- **🔴 Reels feed black-screen layout bug**: `PageLayout.module.css` `.shellDark` was `min-height: 100vh`, which does not establish a definite height for percentage-based children. The chain `<main flex:1>` → `.feed{height:100%}` → `.slot{height:100%}` → `.card{height:100%}` → `<video>{height:100%}` collapsed to 0, so the player rendered 768×0 and was both playing and invisible. Switched `.shellDark` to `height: 100vh; height: 100dvh;` and gave `.mainDark` `height: 100%`. Reels feed and detail viewer now render full-bleed on mobile and desktop.
- **🟢 Stuck-reel self-heal**: added `POST /api/reels/:reelId/reconcile` on the backend and an auto-trigger inside `useReel` + `UploadContext` polling. When Mux's `video.upload.asset_created` / `video.asset.ready` webhook never delivers (the canonical reason a reel stays in `pending_upload` forever), the frontend asks the server to query Mux directly on the 3rd / 8th / 15th poll. The endpoint mirrors webhook semantics — playback id, duration, aspect ratio, thumbnail; over-cap detection deletes the asset and errors the doc the same way. Author-only; rate-limited (20/min/user). A `useReconcileReel()` mutation is exposed too if we add an explicit "Sync" button later. See `Cozie/scripts/reels-backfill-from-mux.js` for the bulk rescue path that runs the same service method for every stuck doc.

---

## Reels background music merge — 2026-05-29

Bakes the picked song into the reel video client-side via `ffmpeg.wasm`, with a two-handle music-trimmer UI. The merged file flows through the existing direct-to-Mux upload pipeline unchanged — zero backend infra changes. Planned in [`reels_background_music_merge_106a0f7e.plan.md`](../.cursor/plans/reels_background_music_merge_106a0f7e.plan.md).

### What the user gets
- Pick a video → pick a song → drag a two-handle slider to pick the crop → tap Post.
- The original video audio is silently dropped; the cropped (and, if needed, seamlessly looped) music is baked in for the full duration.
- Live audio preview from the trimmer loops within the selected window, matching the eventual baked output.
- "Music will loop seamlessly to fill the full video" hint shows whenever the crop is shorter than the clip.
- iPhone HEVC clips get a non-blocking "processing takes longer" hint up front.
- Cancel mid-merge via the overlay; `beforeunload` warning blocks accidental refresh.

### Files added
- `src/lib/videoMerge.ts` — singleton-lifecycle FFmpeg pipeline: master `DUR` reprobe via stderr, 3-pass (crop → loop → `apad+atrim+volume` final audio → mux), `-c:v copy` first with `-c:v libx264 -r 30` fallback, mandatory post-mux duration verification (hard-fails with `MergeDurationMismatchError` after one retry).
- `src/components/reels/MusicTrimmer.tsx` (+ `.module.css`) — two `<input type="range">` thumbs stacked over a shared track, preview loop via `timeupdate`, MM:SS labels, HEAD-CORS pre-check that disables itself with a friendly message if the song URL isn't fetchable.
- `src/components/reels/ComposePreparingOverlay.tsx` (+ `.module.css`) — stage-aware modal (load / probe / musicPrep / loop / audio / mux / verify), coarse progress bar, Cancel button (parent terminates the worker), `beforeunload` listener.
- `scripts/copy-ffmpeg-core.mjs` — postinstall: copies `@ffmpeg/core` and `@ffmpeg/core-mt` UMD blobs into `public/ffmpeg/{st,mt}/` so the WASM core is served from our origin (required by COOP/COEP `require-corp`). Idempotent; runs on every `npm install`.
- `public/ffmpeg/{st,mt}/` — single-thread + multi-thread cores. `.gitignore`d so the ~32 MB blobs never get committed.

### Files modified
- `src/pages/ComposeReel.tsx` — render the trimmer when video + song are both present; preload `ffmpeg.wasm` on the same condition (warms WASM during crop tweaks, not after Post); HEVC heuristic; submit path runs the merge first, then hands the merged `File` to the existing `useCreateReel` → `useUpload.start()` pipeline. On `MergeDurationMismatchError`, surfaces a one-tap "Post without music" CTA so we never silently strip the user's chosen audio without telling them. Filters out songs with `fileUrl === null` so the picker can't show an unplayable track.
- `vercel.json` — scoped `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: credentialless` on `/compose/reel` only (so SAB / multi-thread WASM work without breaking Firebase auth iframes / Mux HLS player on other routes); `Cross-Origin-Resource-Policy: cross-origin` + `Cross-Origin-Embedder-Policy: require-corp` on `/ffmpeg/(.*)` so the cores load under the credentialless COEP context.
- `package.json` — added `@ffmpeg/ffmpeg`, `@ffmpeg/util`, `@ffmpeg/core`, `@ffmpeg/core-mt`; added `postinstall` and `copy:ffmpeg` scripts.
- `.gitignore` — `public/ffmpeg/` excluded.

### Backend changes (single, surgical)
- `Cozie/services/musicService.js` — `search()` response now includes `fileUrl` and `duration` per song, so the reels composer can hand the song straight to the trimmer / merge without a second round trip. ShareMusic uses `Pick<MusicTrack, ...>` for its rows and is unaffected by the extra fields.

### Bundle impact
- Critical-path `index-*.js`: **421.91 KB / 132.22 KB gzipped** — unchanged from the previous slice (no ffmpeg deps reach it).
- `ComposeReel-*.js` chunk: **22.88 KB / 8.76 KB gzipped** (up from ~6 KB — the trimmer, overlay, merge driver, and `@ffmpeg/ffmpeg` wrapper).
- `ffmpeg-core.wasm` blobs sit at `/ffmpeg/{st,mt}/ffmpeg-core.wasm` (~32 MB each) and are fetched ONLY when the user is on `/compose/reel` AND has picked both a video and a song. Cached aggressively by the browser, so subsequent merges in the same session reuse the worker.
- `Reels.module-*.js` is unchanged at **537.44 KB / 168.16 KB gzipped** (still hls.js + reel runtime; nothing new in here).

### Bug-vs-defence cross-reference (mirrors plan §9)
| Reference bug | Cause | Where the defence lives |
|---|---|---|
| #1 "Music ends before video" | `-stream_loop` + missing `apad` + missing `-t` cap | Concat-demuxer pre-loop with `floor(DUR/musicDur)+2` repeats; Pass B's `apad=whole_dur=DUR` runs BEFORE `atrim`; `-t DUR` on every output; mandatory post-mux duration probe with one auto-retry |
| #2 "AAC priming drift" | `-c copy` on an audio stream we just trimmed | Every audio pass re-encodes (mp3 then aac); we never `-c copy` audio |
| #3 "Per-segment length mismatch" | Planned vs actual duration drift | Master `DUR = min(<video>.duration, ffmpeg-stderr-Duration)`; single source of truth threaded through every `-t` and `atrim=duration=...` |
| #4 "Muxed output wrong" | Negative timestamps, missing `-t` cap, missing fast-start | Pass C carries all four flags: `-t DUR`, `-shortest`, `-avoid_negative_ts make_zero`, `-movflags +faststart` |
| #5 "Music plays during silent intro" | Missing PTS rebase | `asetpts=PTS-STARTPTS` in Pass B's filter chain |

### Singleton + cancel lifecycle (the bits not obvious from reading the code)
- `ensureFfmpeg()` is the only call site that creates a worker. Subsequent calls reuse the in-memory `FFmpeg` instance and skip the 30 MB WASM download.
- `terminate()` (used by Cancel + by error-path cleanup) destroys the worker. We set `state.alive = false` so the NEXT merge call re-runs `load()` against a fresh worker. This avoids the "Cannot execute on terminated worker" trap that would otherwise hit on the first retry after a cancel.
- Cancellation propagates via `AbortSignal`: ComposeReel owns an `AbortController`, hands its `.signal` to `mergeVideoWithMusic`, and calls `.abort()` from the overlay's Cancel button. We call `terminate()` immediately on abort so the in-flight `exec` halts; the actual `throw` happens at the next checkpoint and surfaces as `MergeAbortError`.

### Bundled fix — broken song search
- **Symptom**: typing in the song picker (on both `/compose/reel` and `/share-music`) always returned "No songs found".
- **Root cause**: library docs predate the `titleLower` / `artistLower` migration that powers `musicRepository.findByTitlePrefix/findByArtistPrefix`. They were invisible to the prefix-range queries.
- **Fix (Part 1, code, ships with this feature)**: `musicService.search()` now falls back to scanning up to 200 most-recent docs and filtering in-memory for `title.toLowerCase().includes(term) || artist.toLowerCase().includes(term)` when the prefix queries return zero. On any match it fire-and-forget writes `titleLower` / `artistLower` back so the next search hits the fast path (the library converges to fully-backfilled over time, no ops step needed).
- **Fix (Part 2, ops, optional but cheap)**: run `npm run backfill music` (in `Cozie/`) once against production to populate `titleLower` / `artistLower` on every existing doc in one pass. Skips the 200-doc fallback scan for all known songs — useful for perf, not for correctness. Defensive fallback in Part 1 means this is no longer blocking.

### Out of scope (carry-over follow-ups)
- Waveform render in the trimmer (Wavesurfer.js or a custom canvas) — current preview is play/pause only.
- Backend audio proxy (`GET /api/music/:songId/audio`) for songs hosted off Firebase Storage / outside our CORS allowlist; until then the trimmer's HEAD pre-check politely refuses non-CORS-friendly URLs.
- Server-side FFmpeg fallback worker if mobile OOM failure rates are high (especially older iOS Safari).
- A `audioSource` enum on the reel doc (`music | original | silent`) for analytics + a player-overlay badge.
- Custom music upload from the device (library picks only today).
- Video trim UI — reuse the same two-handle slider; target file is `user_video_raw.mp4`; add a Phase 0 ffmpeg crop call before Pass A.
- `videoMerge.spec.ts` regression guard — the plan §6 mentions vitest, but vitest isn't installed in this project yet. Adding it pulls in a non-trivial dependency just for one gated FFmpeg-WASM smoke test. Track separately when we wire up the broader test infra.

### Review-pass hardening (2026-05-29, same day)
Resolved every "blocker before merge" + "nice-to-have" item from the senior-engineer review of this slice.

- **🔴 `ensureFfmpeg()` rejection-trap fixed**: `state.loading` is now cleared in a `finally` inside the IIFE, so a failed `ffmpeg.load()` no longer leaves a permanently-rejected promise in the singleton cache. The next merge / preload attempt re-tries the load fresh; previously the user was stuck until they reloaded the tab.
- **🔴 `mergeVideoWithMusic` load-failure path safe**: the try/catch now wraps the entire body including `await ensureFfmpeg()`. The catch guards `terminate()` on `if (ffmpeg)` so a load failure (where the worker never booted) can't double-throw on cleanup. Documented failure semantics in the function docblock (`MergeAbortError` / `MergeDurationMismatchError` / generic `Error`).
- **🔴 Firebase Storage CORS config shipped in-repo**: added `Cozie/storage.cors.json` (origins: localhost dev + both vercel deploys; methods: GET, HEAD; standard response headers; 1 h cache) and a no-dependency Node script `Cozie/scripts/storage-cors.mjs` using the existing `firebase-admin` + `FRONTEND_FIREBASE_SERVICE_ACCOUNT` env. Wired three npm scripts: `npm run storage:cors:apply` (one-shot setter), `npm run storage:cors:verify` (read-only inspection), `npm run storage:cors:diff` (CI-friendly drift detection; exit 2 on mismatch). **Run `npm run storage:cors:apply` once against production before enabling music-merge for users** — without it the trimmer's HEAD pre-check will mark every song unavailable. The script is idempotent; safe to re-run.
- **🟡 Analytics primitive + merge metrics**: added `Cozie-cs/src/lib/analytics.ts` — a tiny `track(event, props)` surface that no-ops by default, optionally registers a handler (`setAnalyticsHandler`), and bridges to `window.posthog?.capture` when present. `videoMerge.ts` now emits `reel_merge_completed` (with `durMs`, `masterDurSec`, `usedLibx264`, `crossOriginIsolated`, `videoBytes`, `outBytes`) and `reel_merge_failed` (with `durMs`, `stage`, `usedLibx264`, `aborted`, `reason`, truncated `message`). Wire a real handler whenever PostHog / Mixpanel lands; until then dev builds mirror to `console.debug` and prod is silent.
- **🟡 Feature flag**: `VITE_ENABLE_MUSIC_MERGE` (default `true`) read via `Cozie-cs/src/lib/featureFlags.ts`. When `false`: the MusicTrimmer doesn't render, the preload is skipped, the WASM cores are never fetched, and the submit path always uploads the raw video while still attributing the picked `songId`. Kill switch for the rare case where a mobile cohort regresses; flipping the env in Vercel disables the surface without a code revert. Documented in `.env.example`.
- **🟡 Dead-code cleanup**: removed unused `MusicTrack` import + dead `export type { MusicTrack }` from `ComposeReel.tsx`; tightened the `ffmpeg.readFile` result handling in `videoMerge.ts` to a single `as Uint8Array` assertion (the old `instanceof Uint8Array ? out : TextEncoder.encode(String(out))` branch was unreachable and would have produced garbled bytes if hit).
- **🟡 Vercel header source widened**: `/compose/reel` → `/compose/reel(/.*)?` so any future sub-route (e.g., `/compose/reel/edit/:id`) inherits COOP/COEP without us re-noticing the gap.
- **🟡 Defensive trim clamps**: `videoMerge.mergeVideoWithMusic` now clamps `musicStartSec` ≥ 0 and `musicEndSec` ≥ start + 50 ms regardless of caller input. The trimmer already enforces these in the UI; this is belt-and-braces for any future call sites.
- **🟢 `fetchFile` simplification**: replaced the manual `new Uint8Array(await job.video.arrayBuffer())` round-trip with `fetchFile(job.video)` for symmetry with the music load and a smaller momentary heap.

#### Pre-rollout checklist (must complete before flipping `VITE_ENABLE_MUSIC_MERGE` on for users)
1. `cd Cozie && npm run storage:cors:apply` against production (uses `FRONTEND_FIREBASE_SERVICE_ACCOUNT`).
2. `npm run storage:cors:verify` and confirm the rule list matches `storage.cors.json`.
3. Manually verify in a private window: open the live frontend, pick a video + a song, confirm the MusicTrimmer renders (no "song can't be used" message), drag the slider, hit Post, watch the merge run, confirm the resulting Mux reel plays full-length with the picked music.
4. Watch the analytics handler (once wired) or browser console (in a dev build) for `reel_merge_completed` / `reel_merge_failed` events on the first ~50 merges. Investigate any non-zero `_failed` rate.
5. Keep `VITE_ENABLE_MUSIC_MERGE=true` only after steps 1–4 are green.

### Verification (post-slice)
- `npx tsc --noEmit -p tsconfig.app.json` → exit 0
- `npx eslint src/lib/videoMerge.ts src/pages/ComposeReel.tsx src/components/reels/MusicTrimmer.tsx src/components/reels/ComposePreparingOverlay.tsx` → exit 0
- `npm run build` → 1750 modules. Critical path unchanged; new code isolated in `ComposeReel-*.js` (22.88 KB / 8.76 KB gzipped). WASM cores ship under `dist/ffmpeg/{st,mt}/` and load only on demand.
- `node --check Cozie/services/musicService.js` → exit 0

### Manual verification matrix (run before production rollout)
| Case | Input video | Music crop | What to check |
|------|-------------|-----------|---------------|
| 1 | 30 s 1080p MP4 (h264) | 0–15 s of 3 min song | Stream-copy path; output exactly 30.0 s; music loops cleanly |
| 2 | 8 s clip | 0–20 s of 30 s song | Trim-longer-than-video branch |
| 3 | 60 s clip | 0–10 s of 10 s song | Heavy loop; no boundary glitch |
| 4 | iPhone HEVC .mov | Any | Forces libx264 fallback; HEVC hint shown |
| 5 | Browser-recorded webm (vp9) | Any | Forces libx264 fallback from a different container |

For each case: confirm Mux receives a single direct PUT of the merged MP4; in Mux dashboard, asset → `ready`; in the player, music plays full-length and the original audio is silent.

Plus header checks:
- `window.crossOriginIsolated === true` on `/compose/reel`; `false` everywhere else.
- `/ffmpeg/mt/ffmpeg-core.wasm` returns CORP `cross-origin` + COEP `require-corp`.

