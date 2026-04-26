/**
 * Tiny client for talking to the Velosta backend gateway.
 *
 * - Reads base URL from NEXT_PUBLIC_API_BASE_URL (defaults to http://localhost:8000).
 * - Auto-attaches the bearer access token from localStorage.
 * - Unwraps the { ok, data, error } response envelope so callers get the data
 *   directly (or a thrown ApiError on failure).
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code = "unknown_error",
    status = 0,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type FetchOpts = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean; // attach bearer token if available; default true
};

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("accessToken");
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: FetchOpts = {}
): Promise<T> {
  const { body, auth = true, headers, ...rest } = opts;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...((headers as Record<string, string>) || {}),
  };

  if (auth) {
    const token = readToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith("http")
    ? path
    : `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(
      "Could not reach the Velosta server. Check that the backend is running.",
      "network_error",
      0,
      { original: String(err) }
    );
  }

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    /* empty body or non-JSON */
  }

  if (!res.ok || (payload && payload.ok === false)) {
    const err = payload?.error ?? {};
    throw new ApiError(
      err.message || `Request failed with ${res.status}`,
      err.code || "request_failed",
      res.status,
      err.details
    );
  }

  return (payload?.data ?? payload) as T;
}

export const api = {
  get: <T = unknown>(path: string, opts?: FetchOpts) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, opts?: FetchOpts) =>
    apiFetch<T>(path, { ...opts, method: "POST", body }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: FetchOpts) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body }),
  put: <T = unknown>(path: string, body?: unknown, opts?: FetchOpts) =>
    apiFetch<T>(path, { ...opts, method: "PUT", body }),
  delete: <T = unknown>(path: string, opts?: FetchOpts) =>
    apiFetch<T>(path, { ...opts, method: "DELETE" }),
};

// ── Auth helpers ──────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
}

export interface TokenBundle {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export const authApi = {
  signup: (input: { email: string; password: string; name?: string }) =>
    api.post<TokenBundle>("/api/auth/signup", input, { auth: false }),

  login: (input: { email: string; password: string }) =>
    api.post<TokenBundle>("/api/auth/login", input, { auth: false }),

  google: (idToken: string) =>
    api.post<TokenBundle>(
      "/api/auth/google",
      { id_token: idToken },
      { auth: false }
    ),

  refresh: (refreshToken: string) =>
    api.post<TokenBundle>(
      "/api/auth/refresh",
      { refresh_token: refreshToken },
      { auth: false }
    ),

  me: () => api.get<{ user: AuthUser }>("/api/auth/me"),

  adminLogin: (input: { email: string; password: string }) =>
    api.post<{ accessToken: string; tokenType: string }>(
      "/api/auth/admin/login",
      input,
      { auth: false }
    ),
};

export function persistSession(bundle: TokenBundle) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("accessToken", bundle.access_token);
  window.localStorage.setItem("refreshToken", bundle.refresh_token);
  window.localStorage.setItem("userData", JSON.stringify(bundle.user));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("accessToken");
  window.localStorage.removeItem("refreshToken");
  window.localStorage.removeItem("userData");
}
