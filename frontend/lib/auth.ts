/**
 * Authentication utilities - handles login, logout, token management,
 * registration, and OAuth (Google / Microsoft) flows.
 * Integrated with FastAPI backend.
 */

import { fetchData } from "./fetcher";

const ACCESS_TOKEN_KEY = "access_token";

// FastAPI response format
interface FastAPITokenResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  position?: string;
  avatar_url?: string;
  department_id?: string;
  is_active: boolean;
  created_at: string;
}

interface AuthResponse {
  access: string;
  user: User;
}

// ─────────────────────────────────────────────────────────────────────────────
// Token Management
// ─────────────────────────────────────────────────────────────────────────────

export function setToken(token: string, keepLoggedIn: boolean = true): void {
  if (typeof window === "undefined") return;
  const isSecure = window.location.protocol === "https:";
  let cookieString = `${ACCESS_TOKEN_KEY}=${token}; path=/; samesite=strict`;
  if (isSecure) {
    cookieString += "; secure";
  }
  if (keepLoggedIn) {
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    cookieString += `; max-age=${maxAge}`;
  }
  document.cookie = cookieString;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const matches = document.cookie.match(
    new RegExp(
      `(?:^|; )${ACCESS_TOKEN_KEY.replace(/([.*+?^={}|\\-\\.\\/(\\)])/g, "\\$1")}=([^;]*)`,
    ),
  );
  return matches ? decodeURIComponent(matches[1]) : null;
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth State
// ─────────────────────────────────────────────────────────────────────────────

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export async function getCurrentUser(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;
  try {
    return await fetchData<User>("/api/users/me", { token });
  } catch {
    await logout();
    return null;
  }
}

export async function validateToken(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    await fetchData("/api/users/me", { method: "GET", token });
    return true;
  } catch {
    await logout();
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Email / Password Login
// ─────────────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string, keepLoggedIn: boolean = true): Promise<AuthResponse> {
  const response = await fetchData<FastAPITokenResponse>("/api/auth/login/json", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const token = response.access_token;
  setToken(token, keepLoggedIn);

  const user = await fetchData<User>("/api/users/me", { token });
  return { access: token, user };
}

// ─────────────────────────────────────────────────────────────────────────────
// Register (Create Account)
// ─────────────────────────────────────────────────────────────────────────────

export async function register(
  fullName: string,
  email: string,
  password: string,
  confirmPassword: string,
): Promise<AuthResponse> {
  const response = await fetchData<FastAPITokenResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      full_name: fullName,
      email,
      password,
      confirm_password: confirmPassword,
    }),
  });

  const token = response.access_token;
  setToken(token);

  const user = await fetchData<User>("/api/users/me", { token });
  return { access: token, user };
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuth Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Redirects the browser to the Google OAuth consent screen via our backend. */
export function loginWithGoogle(): void {
  window.location.href = "/api/auth/google";
}

/** Redirects the browser to the Microsoft OAuth consent screen via our backend. */
export function loginWithMicrosoft(): void {
  window.location.href = "/api/auth/microsoft";
}

/**
 * Called from the OAuth callback page (/login/oauth-callback).
 * Reads `token` query param from the URL, stores it, and fetches user.
 */
export async function handleOAuthCallback(): Promise<AuthResponse | null> {
  if (typeof window === "undefined") return null;

  // Try reading from URL fragment first (more secure), then query params (backward compat)
  let token: string | null = null;
  let oauthError: string | null = null;

  const hash = window.location.hash.substring(1); // remove '#'
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    token = hashParams.get("token");
    oauthError = hashParams.get("error");
  }

  if (!token) {
    const params = new URLSearchParams(window.location.search);
    token = params.get("token");
    oauthError = oauthError || params.get("error");
  }

  if (oauthError || !token) {
    throw new Error(oauthError ?? "OAuth callback failed — no token received.");
  }

  // Clear the token from the URL for security
  window.history.replaceState(null, "", window.location.pathname);

  setToken(token);
  const user = await fetchData<User>("/api/users/me", { token });
  return { access: token, user };
}

// ─────────────────────────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  clearToken();
}
