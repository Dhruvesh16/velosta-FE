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
  twoFaMethod?: "email_otp" | "totp";
  hasPassword?: boolean;
}

export interface TokenBundle {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface OtpChallenge {
  otpRequired: true;
  otpToken: string;
  twoFaMethod?: "email_otp" | "totp";
}

export interface TotpSetupData {
  secret: string;
  qrDataUri: string;
}

export interface PasskeyCredential {
  id: string;
  name: string | null;
  deviceType: string;
  createdAt: string;
}

export const authApi = {
  signup: (input: {
    email: string;
    password: string;
    name?: string;
    accepted_terms: boolean;
    marketing_opt_in: boolean;
  }) => api.post<TokenBundle>("/api/auth/signup", input, { auth: false }),

  login: (input: { email: string; password: string }) =>
    api.post<OtpChallenge>("/api/auth/login", input, { auth: false }),

  verifyOtp: (input: { otp_token: string; otp: string }) =>
    api.post<TokenBundle>("/api/auth/verify-otp", input, { auth: false }),

  resendOtp: (otp_token: string) =>
    api.post<{ message: string }>("/api/auth/resend-otp", { otp_token }, { auth: false }),

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
    api.post<OtpChallenge>(
      "/api/auth/admin/login",
      input,
      { auth: false }
    ),

  // ── Profile ──────────────────────────────────────────────────────────────

  updateProfile: (input: { name?: string; avatar_url?: string }) =>
    api.patch<{ user: AuthUser }>("/api/auth/profile", input),

  uploadAvatar: async (file: File): Promise<{ user: AuthUser; avatarUrl: string }> => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("accessToken") : null;
    const form = new FormData();
    form.append("avatar", file);
    const res = await fetch(`${BASE_URL}/api/auth/profile/avatar`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const payload = await res.json();
    if (!res.ok || payload.ok === false) {
      const err = payload?.error ?? {};
      throw new ApiError(err.message || "Upload failed", err.code, res.status);
    }
    return payload?.data ?? payload;
  },

  // ── 2-FA ─────────────────────────────────────────────────────────────────

  totpSetup: () =>
    api.get<TotpSetupData>("/api/auth/2fa/totp/setup"),

  totpEnable: (input: { secret: string; code: string }) =>
    api.post<{ twoFaMethod: string; user: AuthUser }>("/api/auth/2fa/totp/enable", input),

  twoFaDisable: () =>
    api.post<{ twoFaMethod: string; user: AuthUser }>("/api/auth/2fa/disable"),

  // ── Account ───────────────────────────────────────────────────────────────

  deleteAccount: (password: string) =>
    apiFetch<{ message: string }>("/api/auth/account", { method: "DELETE", body: { password } }),

  // ── Passkey (WebAuthn) ────────────────────────────────────────────────────

  passkeyRegisterBegin: () =>
    api.post<{ sessionId: string; options: Record<string, unknown> }>("/api/auth/passkey/register/begin"),

  passkeyRegisterComplete: (input: {
    session_id: string;
    credential: Record<string, unknown>;
    name?: string;
  }) =>
    api.post<{ credential: PasskeyCredential; credentials: PasskeyCredential[] }>(
      "/api/auth/passkey/register/complete",
      input,
    ),

  passkeyList: () =>
    api.get<{ credentials: PasskeyCredential[] }>("/api/auth/passkey/credentials"),

  passkeyRename: (credentialId: string, name: string) =>
    api.patch<{ credential: PasskeyCredential }>(
      `/api/auth/passkey/credentials/${encodeURIComponent(credentialId)}`,
      { name },
    ),

  passkeyDelete: (credentialId: string) =>
    api.delete<{ credentials: PasskeyCredential[] }>(
      `/api/auth/passkey/credentials/${encodeURIComponent(credentialId)}`,
    ),

  passkeyLoginBegin: () =>
    api.post<{ sessionId: string; options: Record<string, unknown> }>(
      "/api/auth/passkey/login/begin",
      {},
      { auth: false },
    ),

  passkeyLoginComplete: (input: {
    session_id: string;
    credential: Record<string, unknown>;
  }) =>
    api.post<TokenBundle>("/api/auth/passkey/login/complete", input, { auth: false }),
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
