// ── Destination Discovery Service ──────────────────────────────────────────────
// Calls the backend LLM endpoint to discover destinations based on budget, duration, and location.

import type {
  DiscoveredDestination,
} from "@/lib/stores/onboarding-store";
import { verifyDestinationCoords } from "@/lib/services/geocoding";

interface DiscoverParams {
  budget: { min: number; max: number; label: string };
  duration: number;
  userLocation: { name: string; coordinates: [number, number] };
}

/**
 * Fetch LLM-generated destinations from the backend.
 * Falls back to an empty array on error.
 */
export async function fetchDiscoveredDestinations(
  params: DiscoverParams,
  accessToken: string
): Promise<DiscoveredDestination[]> {
  // Timeout protection — abort after 30 seconds
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_URL}/api/velosta-ai/discover-destinations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          budgetMin: params.budget.min,
          budgetMax: params.budget.max,
          budgetLabel: params.budget.label,
          duration: params.duration,
          userLocationName: params.userLocation.name,
          userLat: params.userLocation.coordinates[1],
          userLng: params.userLocation.coordinates[0],
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to discover destinations");
    }

    const data = await res.json();

    if (!Array.isArray(data.destinations)) {
      throw new Error("Invalid response format");
    }

    // Validate and normalize coordinates
    const parsed = data.destinations
      .map((d: any, i: number): DiscoveredDestination | null => {
        // Extract lat/lng — handle both flat fields and coordinates array
        let lng = Number(d.lng ?? d.coordinates?.[0]);
        let lat = Number(d.lat ?? d.coordinates?.[1]);

        // Validate coordinate ranges
        if (isNaN(lat) || isNaN(lng)) return null;
        if (lat < -90 || lat > 90) return null;
        if (lng < -180 || lng > 180) return null;

        // Sanity: if they look swapped (lng in lat range for India context)
        // India lat ≈ 8–37, lng ≈ 68–97
        if (lat > 60 && lng < 40) {
          [lat, lng] = [lng, lat];
        }

        return {
          id: d.id || `dest-${i}`,
          name: d.name || "Unknown",
          state: d.state || "",
          coordinates: [lng, lat] as [number, number],
          estimatedCost: d.estimatedCost || d.estimated_cost || "—",
          recommendedDays: d.recommendedDays ?? d.recommended_days ?? 3,
          highlights: Array.isArray(d.highlights) ? d.highlights : [],
          season: d.season || "All year",
          tagline: d.tagline || "",
          budgetFit: d.budgetFit || d.budget_fit || "perfect",
        };
      })
      .filter((d): d is DiscoveredDestination => d !== null);

    // Verify and correct coordinates via Mapbox geocoding (parallel, max 5 at a time)
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
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}





