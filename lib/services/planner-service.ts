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

const _API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

function _readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("accessToken");
}

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
}

interface RawPlannerEnvelope {
  itinerary: PlannerResponse;
  cached: boolean;
}

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
  });

  const inner = data.itinerary as PlannerResponse;

  // Defensive: if the model returned an itinerary without the discriminator,
  // infer it from `itineraryTable` presence.
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

  (async () => {
    const token = _readToken();
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
        }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Stream request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
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
            const msg = JSON.parse(payload) as { type: string; text?: string; itinerary?: unknown };
            if (msg.type === "token" && msg.text) {
              callbacks.onToken(msg.text);
            } else if (msg.type === "done" && msg.itinerary) {
              callbacks.onDone(msg.itinerary as PlannerResponse);
            }
          } catch {
            /* ignore malformed SSE frames */
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return ac;
}

/**
 * Promise wrapper around generatePlannerStream for use with async/await.
 * onToken is called for each raw chunk (for live UI updates).
 * Resolves with the final PlannerResponse or rejects on error.
 */
export function generatePlannerStreamAsync(
  req: PlannerRequest,
  onToken: (token: string) => void
): Promise<PlannerResponse> {
  return new Promise((resolve, reject) => {
    generatePlannerStream(req, { onToken, onDone: resolve, onError: reject });
  });
}
