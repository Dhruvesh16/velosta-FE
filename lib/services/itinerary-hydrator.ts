// ── Itinerary Hydrator ────────────────────────────────────────────────────────
// Single pipeline that takes a raw planner response and pushes it into
// planner-store + map-store so EVERY surface (desktop / mobile / chat /
// trip-inputs) hydrates the same way.
//
// Pipeline:
//   1. Normalize + commit itinerary into planner-store
//   2. Geocode destination → fly camera there
//   3. Enrich each row with real coordinates (Mapbox)
//   4. Re-commit enriched itinerary + recompute spent budget
//   5. Convert rows to map markers and commit to map-store

import { usePlannerStore } from "@/lib/stores/planner-store";
import { useMapStore } from "@/lib/stores/map-store";
import {
  geocodeDestination,
  enrichItineraryWithCoordinates,
  itineraryToMarkers,
} from "@/lib/services/geocoding";
import type { ItineraryData, TripData } from "@/lib/types/planner.types";

/**
 * Phase 1 — synchronous, instant.
 * Commits the raw itinerary into the planner store so the UI can transition
 * to the planner page immediately without waiting for any network calls.
 */
export function commitItineraryToStores(
  rawData: unknown,
  rawTripData: TripData
): void {
  const data = rawData as ItineraryData;
  usePlannerStore.getState().setItineraryData(data, rawTripData);
}

/**
 * Phase 2 — async, runs in the background after the UI has already transitioned.
 * Geocodes every itinerary activity and pushes real map markers.
 * Never throws — failures are logged and the itinerary still works without markers.
 */
export async function enrichItineraryInBackground(
  rawData: unknown,
  destination: string
): Promise<void> {
  try {
    // 1. Fly to destination
    let destCoords: [number, number] | null = null;
    destCoords = await geocodeDestination(destination);
    if (destCoords) {
      useMapStore.getState().flyTo(destCoords, 10, 0);
    }

    // 2. Enrich with real coordinates
    const currentItinerary = usePlannerStore.getState().itinerary;
    const enriched = await enrichItineraryWithCoordinates(
      currentItinerary,
      destination
    );

    // 3. Commit enriched + recompute spent budget
    usePlannerStore.setState({
      itinerary: enriched,
      spentBudget: enriched.reduce((sum, d) => {
        const m = (d.dailyCost ?? "").replace(/[₹$€£,\s]/g, "").match(/[\d.]+/);
        return sum + (m ? parseFloat(m[0]) : 0);
      }, 0),
    });

    // 4. Push markers to map
    const markers = itineraryToMarkers(enriched);
    useMapStore.getState().setMarkers(markers);

    // 5. Cinematic zoom into day-1 centroid
    const day1Coords = enriched[0]?.coordinates;
    const finalCenter = day1Coords ?? destCoords;
    if (finalCenter) {
      setTimeout(() => {
        useMapStore.getState().flyTo(finalCenter, 12.5, 35);
      }, 350);
    }
  } catch (err) {
    console.warn("[itinerary-hydrator] background enrichment failed:", err);
  }
}

/**
 * Legacy combined helper — kept for callers outside the onboarding flow
 * (e.g. chat panel modifications). Runs both phases sequentially.
 */
export async function hydrateItineraryIntoStores(
  rawData: unknown,
  rawTripData: TripData
): Promise<void> {
  const data = rawData as ItineraryData;
  commitItineraryToStores(rawData, rawTripData);
  await enrichItineraryInBackground(rawData, data.destination ?? "");
}
