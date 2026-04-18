// ── Planner Service ───────────────────────────────────────────────────────────
// Single source of truth for talking to the BE planner microservice.
//
// BE endpoint: POST /api/planner/generate
// Returns (after envelope unwrap): { itinerary: <model JSON>, cached: boolean }
//
// The model returns one of two shapes (see BE prompts.py):
//   1. { isTextResponse: true,  message: "..." }
//   2. { isTextResponse: false, destination, itineraryTable: [...], ... }

import { api } from "@/lib/api";

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
