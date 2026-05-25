# Cozie Frontend — Progress Checklist

A granular tracking document mapping the `Cozie-cs/` frontend implementation against the Cozie SRS. Tick items off as they're completed.

**Legend**
- `[x]` Implemented and wired up in code.
- `[~]` Partially done — needs work (see note).
- `[ ]` Not started.

**Snapshot:** roughly **30%** of frontend scope from the SRS (47 of 213 granular items checked).

> **Architecture milestone (2026-05-25):** Tier 1–4 refactor shipped — see `## Frontend refactor — 2026-05-25` at the bottom of this file.

> Each bar is 10 cells wide. When you tick or untick an item below, also update the count and bar in the matching row here so this dashboard stays in sync.

## Progress at a glance

| §  | Section                          | Progress                  | Done   |
|----|----------------------------------|---------------------------|--------|
| —  | **Overall**                      | `▰▰▱▱▱▱▱▱▱▱`              | 47/213 |
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
| 14 | Reels                            | `▱▱▱▱▱▱▱▱▱▱`              | 0/5    |
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

- [ ] Reels tab
- [ ] Vertical-swipe reel player
- [ ] Record / upload reel UI
- [ ] Reel likes / comments / shares UI
- [ ] Reel discovery feed

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

