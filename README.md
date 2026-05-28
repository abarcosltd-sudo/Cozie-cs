# Cozie – Frontend

Vite + React 19 + TypeScript SPA for the Cozie application. In production it is built to static assets and served by `nginx:1.27-alpine` on port `80` (mapped to `8080` locally below).

## Tech stack

- React 19 (with the React Compiler enabled)
- TypeScript ~5.9
- Vite 7
- React Router 7
- @tanstack/react-query 5 (data fetching, caching, optimistic updates)
- lucide-react (icons)
- hls.js (HTTP Live Streaming player for the Reels feed — native HLS used on Safari)
- CSS Modules (per-component, scoped) + a small set of global tokens in `src/index.css`

The frontend is **stateless** at the browser-API layer — there is no Firebase Web SDK and no Axios. All backend access goes through `src/lib/api.ts`. Reel video uploads go directly to Mux via a backend-issued signed URL (`src/lib/upload.ts` — XHR-based for upload-progress events).

## Architecture

```
src/
  lib/
    api.ts            single fetch client: VITE_API_URL, bearer injection,
                      {success,data} envelope unwrap, 401 → logout
    hls.ts            HLS attach helper (native on Safari, hls.js elsewhere)
    upload.ts         XHR-based PUT with upload-progress + AbortSignal
    queryClient.ts    react-query defaults
  contexts/
    AuthContext.tsx   token + current user, useAuth() hook
    UploadContext.tsx global single-upload state machine for reel uploads
                      (queued → uploading → processing → ready | errored)
  components/
    routing/          ProtectedRoute, PublicOnlyRoute
    ui/               Button, Avatar, Modal, Spinner, ErrorBox, EmptyState
    layout/           Header, BottomNav, PageLayout (with theme="dark" prop)
    users/            UserList, FollowButton
    reels/            ReelPlayer, ReelCard, ReelActionRail,
                      ReelCommentsSheet, ReelShareSheet,
                      CreateSheet (center-nav bottom sheet), UploadToast
    ErrorBoundary.tsx root-level error boundary
  hooks/              one file per backend feature: useFeed, useFollow,
                      useMessages, useNotifications, useProfile, useReels
  pages/              one file per route; each owns its .module.css
                      (Reels.tsx, ComposeReel.tsx, ReelDetail.tsx added)
  types/api.ts        shared DTOs mirroring backend responses
                      (Reel / ReelStatus / Notification reel_* types here)
```

Every route is wrapped in `<ProtectedRoute>` or `<PublicOnlyRoute>` in `App.tsx`, every data fetch goes through a react-query hook, and every API call goes through `api.ts`. Adding a feature is "new hook + new page + new route registration" — no fetch wiring, no manual auth/token handling.

The Reels feature follows the same shape but adds two cross-cutting wrappers at the App root: `<UploadProvider>` (global single-upload state machine — survives navigation so users can keep browsing while a reel uploads) and `<UploadToast>` (persistent floating chip that reads from that context).

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + CLI)
- A reachable backend URL. Default for dev is `http://localhost:5000`; production points at the deployed backend via the `VITE_API_URL` build arg.

> **Note on lockfiles:** the `Dockerfile` tries `npm ci` first and falls back to `npm install` if `package-lock.json` drifts out of sync with `package.json`. For fully reproducible builds, run `npm install` here once and commit the regenerated `package-lock.json`.

## Build & run with Docker

```bash
cd Cozie-cs
docker build -t cozie-frontend --build-arg VITE_API_URL=http://localhost:5000 .
docker run --rm -p 8080:80 cozie-frontend
```

- Multi-stage build: Vite produces a static `dist/` bundle, which is then served by `nginx` using the bundled `nginx.conf` (SPA history fallback + long-cache for hashed `/assets/` + security headers).
- `VITE_API_URL` is a **build-time** argument — Vite bakes it into the JS bundle. Rebuild the image whenever you change it (e.g. `https://api.your-domain.com`).
- App will be available at <http://localhost:8080>.

## Local development (without Docker)

```bash
npm install
npm run dev       # starts the Vite dev server
npm run build     # tsc -b && vite build
npm run preview   # preview the production build locally
npm run lint
npm run typecheck # tsc --noEmit
```

Create a `.env` (or `.env.local`) with any `VITE_*` variables you need, e.g.:

```env
VITE_API_URL=http://localhost:5000
```

## Production niceties

- **Security headers** in `nginx.conf`: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP/CORP. CSP allows the deployed backend host, Firebase Storage (for signed audio/album-art URLs), Mux delivery (`stream.mux.com`, `image.mux.com` for HLS playlists + segments + thumbnails) and Mux direct-upload ingest (`storage.googleapis.com`). Update if you swap CDNs.
- **PWA manifest** at `/manifest.webmanifest`, SVG favicon at `/cozie.svg`, theme color `#a855f7`.
- **Bundle**: ~973 KB JS / 304 KB gzipped, ~56 KB CSS / 11 KB gzipped at last build (1735 modules). The bump from ~398 KB → ~973 KB JS is hls.js entering the bundle for the Reels feed. Route-level code-splitting (`React.lazy` on `Reels`, `ReelDetail`, `ComposeReel`) is the next perf step.

## Troubleshooting

- **`npm ci` fails with `EUSAGE … Missing: … from lock file`** &nbsp;– your `package-lock.json` is out of sync with `package.json`. Run `npm install` here and commit the new lockfile. The Dockerfile's fallback to `npm install` lets the build succeed in the meantime.
- **API calls fail / CORS errors** &nbsp;– make sure the backend is running and reachable at the URL you passed via `--build-arg VITE_API_URL=...`, and that this origin is allowed in the backend's CORS config.
- **401 immediately after login** &nbsp;– clock skew between the JWT issuer and the browser. Check your machine time, and confirm `JWT_SECRET` and `JWT_ISSUER` (if used) match between local dev and the backend image.
- **CSP blocks an asset** &nbsp;– the browser console logs a `Refused to load … because it violates the Content Security Policy directive` line. Add the host to the appropriate directive in `nginx.conf` (e.g. `img-src` for an image host).
- **Refreshing a route shows a 404** &nbsp;– should not happen with the bundled `nginx.conf` (it falls back to `index.html`). If you replace the config, keep `try_files $uri $uri/ /index.html;` for SPA routing.
