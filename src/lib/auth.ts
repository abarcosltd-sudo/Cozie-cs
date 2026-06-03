/**
 * Auth API helpers. The OTP-based signup/login flows are inlined in
 * `pages/signup.tsx`, `pages/login.tsx`, and `pages/verification.tsx`
 * — we don't refactor those here. This module is the canonical place
 * for new Google sign-in calls so the UI never has to know about the
 * `/api/users/google/*` route shape.
 *
 * Response shape mirrors the existing email+password login response so
 * the same `AuthContext.login(token, user)` integration works for both.
 */

import { api } from "./api";
import type { User, UserType } from "../types/api";

export interface GoogleSignupArtistProfile {
  artistName: string;
  genres: string[];
  label?: string;
  website?: string;
  bio?: string;
}

export interface GoogleSignupRequest {
  idToken: string;
  username: string;
  userType: UserType;
  /** Required when `userType === "artist"`; omit for listeners. */
  artistProfile?: GoogleSignupArtistProfile;
}

export interface GoogleAuthResponse {
  token: string;
  /** Partial user — `AuthContext.login` re-fetches `/me` for the full shape. */
  user: Pick<User, "id" | "fullname" | "username" | "email">;
  /** True only on the brand-new-account branch of /google/signup. */
  newAccount?: boolean;
  /** True when the backend auto-linked Google to an existing password account. */
  linked?: boolean;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export async function signupWithGoogle(
  body: GoogleSignupRequest
): Promise<GoogleAuthResponse> {
  return api.post<GoogleAuthResponse, GoogleSignupRequest>(
    "/api/users/google/signup",
    body,
    { skipAuth: true }
  );
}

export async function loginWithGoogle(
  body: GoogleLoginRequest
): Promise<GoogleAuthResponse> {
  return api.post<GoogleAuthResponse, GoogleLoginRequest>(
    "/api/users/google/login",
    body,
    { skipAuth: true }
  );
}
