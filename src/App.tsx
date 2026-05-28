import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/routing/ProtectedRoute";
import { PublicOnlyRoute } from "./components/routing/PublicOnlyRoute";

import Splash from "./pages/splash";
import Login from "./pages/login";
import Signup from "./pages/signup";
import Verification from "./pages/verification";
import Preference from "./pages/Preference";
import ProfileSetup from "./pages/ProfileSetup";
import ConnectMusic from "./pages/ConnectMusic";
import HomeFeed from "./pages/HomeFeed";
import Discover from "./pages/Discover";
import UserProfile from "./pages/UserProfile";
import ShareMusic from "./pages/ShareMusic";
import AddMusic from "./pages/AddMusic";
import PlayMusic from "./pages/PlayMusic";
import Messages from "./pages/Messages";
import ComingSoon from "./pages/ComingSoon";
import Notifications from "./pages/Notifications";
import Followers from "./pages/Followers";
import Following from "./pages/Following";
import SearchResults from "./pages/SearchResults";
import { UploadProvider } from "./contexts/UploadContext";
import { UploadToast } from "./components/reels/UploadToast";
import { FullPageSpinner } from "./components/ui/Spinner";

// Reels pages are split into their own chunks so the ~145 KB hls.js shim
// (pulled in transitively via `ReelPlayer` → `lib/hls.ts`) only loads when
// the user actually navigates into the feature. Compose is split too so
// users who never record a reel never download the picker / probe code.
const Reels = lazy(() => import("./pages/Reels"));
const ComposeReel = lazy(() => import("./pages/ComposeReel"));
const ReelDetail = lazy(() => import("./pages/ReelDetail"));

export default function App() {
  return (
    <UploadProvider>
      {/*
       * Single top-level Suspense for the lazy reel routes. The fallback
       * shows briefly on first navigation to /reels / /reels/:id /
       * /compose/reel; subsequent navigations hit the cached chunk and
       * never see it.
       */}
      <Suspense fallback={<FullPageSpinner label="Loading…" />}>
        <AppRoutes />
      </Suspense>
      <UploadToast />
    </UploadProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Landing → splash if logged out, home-feed if logged in. */}
      <Route path="/" element={<Navigate to="/splash" replace />} />

      {/* --- Public-only (anonymous) screens ----------------------- */}
      <Route
        path="/splash"
        element={
          <PublicOnlyRoute>
            <Splash />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <Signup />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/verification"
        element={
          <PublicOnlyRoute>
            <Verification />
          </PublicOnlyRoute>
        }
      />

      {/* --- Authenticated screens --------------------------------- */}
      <Route
        path="/home-feed"
        element={
          <ProtectedRoute>
            <HomeFeed />
          </ProtectedRoute>
        }
      />
      <Route
        path="/discover"
        element={
          <ProtectedRoute>
            <Discover />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search-results"
        element={
          <ProtectedRoute>
            <SearchResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:userId"
        element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/preference"
        element={
          <ProtectedRoute>
            <Preference />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile-setup"
        element={
          <ProtectedRoute>
            <ProfileSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/connect-music"
        element={
          <ProtectedRoute>
            <ConnectMusic />
          </ProtectedRoute>
        }
      />
      <Route
        path="/share-music"
        element={
          <ProtectedRoute>
            <ShareMusic />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-music"
        element={
          <ProtectedRoute>
            <AddMusic />
          </ProtectedRoute>
        }
      />
      <Route
        path="/play-music"
        element={
          <ProtectedRoute>
            <PlayMusic />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/followers"
        element={
          <ProtectedRoute>
            <Followers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/followers/:userId"
        element={
          <ProtectedRoute>
            <Followers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/following"
        element={
          <ProtectedRoute>
            <Following />
          </ProtectedRoute>
        }
      />
      <Route
        path="/following/:userId"
        element={
          <ProtectedRoute>
            <Following />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-profile"
        element={
          <ProtectedRoute>
            <ComingSoon />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <ComingSoon />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coming-soon"
        element={
          <ProtectedRoute>
            <ComingSoon />
          </ProtectedRoute>
        }
      />
      {/* --- Reels feature ----------------------------------------- */}
      <Route
        path="/reels"
        element={
          <ProtectedRoute>
            <Reels />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reels/:reelId"
        element={
          <ProtectedRoute>
            <ReelDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/compose/reel"
        element={
          <ProtectedRoute>
            <ComposeReel />
          </ProtectedRoute>
        }
      />

      {/* 404 — anything else falls through to splash/home depending on auth. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
