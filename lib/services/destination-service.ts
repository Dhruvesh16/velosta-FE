// ── Destination Discovery Service ──────────────────────────────────────────────
// Calls the planner service to discover destinations from preferences + profile.

import type { DiscoveredDestination } from "@/lib/stores/onboarding-store";
import { verifyDestinationCoords } from "@/lib/services/geocoding";
import { api } from "@/lib/api";

export interface DiscoverParams {
  budget: { min: number; max: number; label: string };
  duration: number;
  userLocation: { name: string; coordinates: [number, number] };
  interests: string[];
  travelerType: string;
  travelerCount: number;
  /** Output of buildTravelProfilePrompt(...) */
  travelProfileContext: string;
  destinationHint?: string;
}

/**
 * Fetch LLM-generated destinations from the planner API.
 * Throws ApiError on HTTP / validation failure.
 */
export async function fetchDiscoveredDestinations(
  params: DiscoverParams
): Promise<DiscoveredDestination[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const data = await api.post<{ destinations: unknown[] }>(
      "/api/planner/discover-destinations",
      {
        budgetMin: params.budget.min,
        budgetMax: params.budget.max,
        budgetLabel: params.budget.label,
        duration: params.duration,
        userLocationName: params.userLocation.name,
        userLat: params.userLocation.coordinates[1],
        userLng: params.userLocation.coordinates[0],
        interests: params.interests,
        travelerType: params.travelerType,
        travelerCount: params.travelerCount,
        travelProfileContext: params.travelProfileContext,
        destinationHint: params.destinationHint,
      },
      { signal: controller.signal }
    );

    if (!Array.isArray(data.destinations)) {
      throw new Error("Invalid response format");
    }

    const parsed = data.destinations
      .map((row: unknown, i: number): DiscoveredDestination | null => {
        if (!row || typeof row !== "object") return null;
        const d = row as Record<string, unknown>;
        let lng = Number(d.lng ?? (d.coordinates as number[])?.[0]);
        let lat = Number(d.lat ?? (d.coordinates as number[])?.[1]);

        if (isNaN(lat) || isNaN(lng)) return null;
        if (lat < -90 || lat > 90) return null;
        if (lng < -180 || lng > 180) return null;

        if (lat > 60 && lng < 40) {
          [lat, lng] = [lng, lat];
        }

        const budgetFitRaw = String(d.budgetFit ?? d.budget_fit ?? "perfect");
        const budgetFit =
          budgetFitRaw === "stretch" || budgetFitRaw === "premium"
            ? budgetFitRaw
            : "perfect";

        return {
          id: String(d.id || `dest-${i}`),
          name: String(d.name || "Unknown"),
          state: String(d.state || ""),
          coordinates: [lng, lat] as [number, number],
          estimatedCost: String(d.estimatedCost ?? d.estimated_cost ?? "—"),
          recommendedDays: Number(d.recommendedDays ?? d.recommended_days ?? 3) || 3,
          highlights: Array.isArray(d.highlights) ? (d.highlights as string[]) : [],
          season: String(d.season || "All year"),
          tagline: String(d.tagline || ""),
          budgetFit,
        };
      })
      .filter((d): d is DiscoveredDestination => d !== null);

    const verified: DiscoveredDestination[] = [];
    for (let i = 0; i < parsed.length; i += 5) {
      const batch = parsed.slice(i, i + 5);
      const results = await Promise.all(
        batch.map(async (dest) => {
          const corrected = await verifyDestinationCoords(
            dest.name,
            dest.state,
            dest.coordinates
          );
          return { ...dest, coordinates: corrected };
        })
      );
      verified.push(...results);
    }

    return verified;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
