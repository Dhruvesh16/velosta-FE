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

export async function hydrateItineraryIntoStores(
  rawData: unknown,
  rawTripData: TripData
): Promise<void> {
  const data = rawData as ItineraryData;

  // 1. Normalize into store
  usePlannerStore.getState().setItineraryData(data, rawTripData);

  // 2. Fly to destination (initial wide-angle approach)
  let destCoords: [number, number] | null = null;
  if (data.destination) {
    destCoords = await geocodeDestination(data.destination);
    if (destCoords) {
      useMapStore.getState().flyTo(destCoords, 10, 0);
    }
  }

  // 3. Enrich with real coordinates
  const currentItinerary = usePlannerStore.getState().itinerary;
  const enriched = await enrichItineraryWithCoordinates(
    currentItinerary,
    data.destination ?? ""
  );

  // 4. Commit enriched + recompute spent budget
  usePlannerStore.setState({
    itinerary: enriched,
    spentBudget: enriched.reduce((sum, d) => {
      const m = (d.dailyCost ?? "").replace(/[₹$€£,\s]/g, "").match(/[\d.]+/);
      return sum + (m ? parseFloat(m[0]) : 0);
    }, 0),
  });

  // 5. Push markers to map
  const markers = itineraryToMarkers(enriched);
  useMapStore.getState().setMarkers(markers);

  // 6. Cinematic zoom into the actual itinerary location.
  //    Prefer the day-1 centroid (tighter, shows the trip "starting point");
  //    fall back to the destination centre if day coords aren't available.
  const day1Coords = enriched[0]?.coordinates;
  const finalCenter = day1Coords ?? destCoords;
  if (finalCenter) {
    // Small delay so the destination flyTo animation finishes its first beat
    // and the user perceives a deliberate zoom-in moment.
    setTimeout(() => {
      useMapStore.getState().flyTo(finalCenter, 12.5, 35);
    }, 350);
  }
}
