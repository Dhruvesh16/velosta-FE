// ── Planner Service ───────────────────────────────────────────────────────────
// Single source of truth for talking to the BE planner microservice.
//
// BE endpoint: POST /api/planner/generate          → full JSON (cached aware)
//              POST /api/planner/generate-stream   → SSE token stream
// Returns (after envelope unwrap): { itinerary: <model JSON>, cached: boolean }
//
// The model returns one of two shapes (see BE prompts.py):
//   1. { isTextResponse: true,  message: "..." }
//   2. { isTextResponse: false, destination, itineraryTable: [...], ... }

import { api } from "@/lib/api";
import { authApi, persistSession } from "@/lib/api";

const _API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

// ── Token helpers ─────────────────────────────────────────────────────────────

function _readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("accessToken");
}

function _isTokenExpiredOrExpiringSoon(token: string, bufferSecs = 120): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    const exp = typeof payload.exp === "number" ? payload.exp : null;
    if (!exp) return false;
    return Math.floor(Date.now() / 1000) > exp - bufferSecs;
  } catch {
    return false;
  }
}

/**
 * Returns a valid access token, refreshing it transparently if needed.
 * Never throws — if refresh fails, returns the original (possibly expired) token
 * so the downstream request can surface the 401 to the caller.
 */
async function _ensureFreshToken(): Promise<string | null> {
  const token = _readToken();
  if (!token) return null;

  if (!_isTokenExpiredOrExpiringSoon(token)) return token;

  try {
    const refreshToken = window.localStorage.getItem("refreshToken");
    if (!refreshToken) return token;
    const bundle = await authApi.refresh(refreshToken);
    persistSession(bundle);
    return bundle.access_token;
  } catch {
    // Refresh failed (e.g. refresh token itself expired) — let caller surface 401
    return token;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ItineraryRow {
  time?: string;
  activity?: string;
  description?: string;
  distance?: string;
  pricing?: string;
  lat?: number;
  lng?: number;
}

export interface ItineraryDay {
  day?: number;
  theme?: string;
  dailyCost?: string;
  rows?: ItineraryRow[];
  meals?: { breakfast?: string; lunch?: string; dinner?: string };
  accommodation?: string;
}

export interface PlannerTextResponse {
  isTextResponse: true;
  message: string;
}

export interface PlannerItineraryResponse {
  isTextResponse: false;
  destination?: string;
  duration?: string;
  summary?: string;
  totalBudget?: string;
  totalEstimatedCost?: string;
  budgetBreakdown?: Record<string, string>;
  itineraryTable?: ItineraryDay[];
  expenseSummary?: { costSavingTips?: string[] };
  localTips?: string[];
  modificationsApplied?: string[];
}

export type PlannerResponse = PlannerTextResponse | PlannerItineraryResponse;

export interface PlannerRequest {
  userSaid: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  currentItinerary?: unknown | null;
  isModificationRequest?: boolean;
  destinationHint?: string;
  desiredDays?: number;
  desiredBudget?: number;
}

interface RawPlannerEnvelope {
  itinerary: PlannerResponse;
  cached: boolean;
}

// ── Non-stream endpoint ───────────────────────────────────────────────────────

/**
 * Generate or modify an itinerary, or get a chat reply.
 * Throws an ApiError on failure (network, 4xx, 5xx, validation).
 */
export async function generatePlannerResponse(
  req: PlannerRequest
): Promise<PlannerResponse> {
  const data = await api.post<RawPlannerEnvelope>("/api/planner/generate", {
    userSaid: req.userSaid,
    conversationHistory: req.conversationHistory ?? [],
    currentItinerary: req.currentItinerary ?? null,
    isModificationRequest: req.isModificationRequest ?? false,
    destinationHint: req.destinationHint,
    desiredDays: req.desiredDays,
    desiredBudget: req.desiredBudget,
  });

  const inner = data.itinerary as PlannerResponse;

  if (typeof inner === "object" && inner !== null && !("isTextResponse" in inner)) {
    if ("itineraryTable" in inner) {
      return { isTextResponse: false, ...(inner as PlannerItineraryResponse) };
    }
    return {
      isTextResponse: true,
      message:
        (inner as { message?: string }).message ??
        "I couldn't generate a response. Could you rephrase?",
    };
  }

  return inner;
}

// ── Streaming variant ────────────────────────────────────────────────────────

/**
 * Stream itinerary generation via SSE.
 *
 * onToken  — called with each raw JSON chunk as it arrives
 * onDone   — called once with the final parsed PlannerResponse
 * onError  — called on network / parse failure
 *
 * Returns an AbortController; call .abort() to cancel mid-stream.
 */
export function generatePlannerStream(
  req: PlannerRequest,
  callbacks: {
    onToken: (token: string) => void;
    onDone: (result: PlannerResponse) => void;
    onError: (err: Error) => void;
  }
): AbortController {
  const ac = new AbortController();
  // Long itineraries (e.g. 21-30 day plans) can stream for several minutes.
  // Keep the connection alive longer before treating it as a hard timeout.
  const STREAM_IDLE_TIMEOUT_MS = 45_000;
  const STREAM_MAX_DURATION_MS = 12 * 60 * 1000;

  (async () => {
    // Always refresh token before starting a long-running stream
    const token = await _ensureFreshToken();
    try {
      const res = await fetch(`${_API_BASE}/api/planner/generate-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userSaid: req.userSaid,
          conversationHistory: req.conversationHistory ?? [],
          currentItinerary: req.currentItinerary ?? null,
          isModificationRequest: req.isModificationRequest ?? false,
          destinationHint: req.destinationHint,
          desiredDays: req.desiredDays,
          desiredBudget: req.desiredBudget,
        }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Stream request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let didEmitDone = false;
      let finished = false;
      let idleTimer: ReturnType<typeof setTimeout> | null = null;
      const hardDeadlineTimer = setTimeout(() => {
        if (finished) return;
        finished = true;
        try {
          reader.cancel();
        } catch {
          /* noop */
        }
        callbacks.onError(new Error("stream_timeout"));
      }, STREAM_MAX_DURATION_MS);

      const clearIdleTimer = () => {
        if (idleTimer) {
          clearTimeout(idleTimer);
          idleTimer = null;
        }
      };
      const armIdleTimer = () => {
        clearIdleTimer();
        idleTimer = window.setTimeout(() => {
          if (finished) return;
          finished = true;
          try {
            reader.cancel();
          } catch {
            /* noop */
          }
          callbacks.onError(new Error("stream_idle_timeout"));
        }, STREAM_IDLE_TIMEOUT_MS);
      };
      armIdleTimer();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        armIdleTimer();
        buf += decoder.decode(value, { stream: true });

        // SSE events are delimited by double newline
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";

        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const msg = JSON.parse(payload) as {
              type: string;
              text?: string;
              itinerary?: unknown;
              code?: string;
              message?: string;
            };
            if (msg.type === "token" && msg.text) {
              callbacks.onToken(msg.text);
            } else if (msg.type === "done" && "itinerary" in msg) {
              finished = true;
              clearIdleTimer();
              clearTimeout(hardDeadlineTimer);
              didEmitDone = true;
              callbacks.onDone(msg.itinerary as PlannerResponse);
              return;
            } else if (msg.type === "error") {
              finished = true;
              clearIdleTimer();
              clearTimeout(hardDeadlineTimer);
              // Server signalled a recoverable failure — abort the read
              // loop so the promise wrapper triggers the non-stream fallback
              // immediately instead of waiting for the connection to close.
              try { reader.cancel(); } catch { /* noop */ }
              callbacks.onError(
                new Error(msg.code || msg.message || "stream_error")
              );
              return;
            }
          } catch {
            /* ignore malformed SSE frames */
          }
        }
      }

      clearIdleTimer();
      clearTimeout(hardDeadlineTimer);
      // Stream closed without a done event — fall back to non-stream endpoint
      if (!didEmitDone) {
        finished = true;
        callbacks.onError(new Error("stream_incomplete"));
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return ac;
}

// ── Promise wrapper with token refresh + non-stream fallback ─────────────────

/**
 * Promise wrapper around generatePlannerStream for use with async/await.
 * - onToken is called for each raw chunk (for live UI updates).
 * - Automatically falls back to the non-stream endpoint when SSE drops.
 * - Refreshes the JWT access token before starting if it is about to expire.
 * - Resolves with the final PlannerResponse or rejects on error.
 */
export function generatePlannerStreamAsync(
  req: PlannerRequest,
  onToken: (token: string) => void
): Promise<PlannerResponse> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const resolveOnce = (result: PlannerResponse) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const rejectOnce = (err: Error) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    generatePlannerStream(req, {
      onToken,
      onDone: (result) => resolveOnce(result),
      onError: (err) => {
        // SSE closed early or any stream-level error → fall back to REST endpoint.
        // We refresh the token again here in case expiry was the cause.
        _ensureFreshToken()
          .then((freshToken) => {
            // Build a one-off request with the fresh token (api.post reads token
            // from localStorage, so persist it first if we got a new one).
            if (freshToken) {
              window.localStorage.setItem("accessToken", freshToken);
            }
            return generatePlannerResponse(req);
          })
          .then((result) => resolveOnce(result))
          .catch((fallbackErr) =>
            rejectOnce(
              fallbackErr instanceof Error
                ? fallbackErr
                : new Error(String(fallbackErr))
            )
          );
      },
    });
  });
}
