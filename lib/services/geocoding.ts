// ── Mapbox Geocoding Service ──────────────────────────────────────────────────
// Uses Mapbox Geocoding API for accurate place resolution.
// All coordinates are [lng, lat] internally for consistency with map stores.

import type { ItineraryDay, MapMarker } from "@/lib/types/planner.types";

/** Simple unique ID generator */
function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// ── Haversine distance in km ────────────────────────────────────────────────
function haversineKm(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number]
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Activities that should NOT be geocoded ───────────────────────────────────
const SKIP_PATTERNS = [
  /check[\s-]?in/i,
  /check[\s-]?out/i,
  /travel\s+(to|from|back)/i,
  /depart/i,
  /arrival|arrive/i,
  /return\s+(journey|trip|home|back)/i,
  /\brest\b/i,
  /free\s+time/i,
  /pack\s+up/i,
  /freshen\s+up/i,
  /\bleisure\b/i,
  /\bsleep\b/i,
];

function shouldSkipGeocoding(name: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(name));
}

function isWithinRange(
  coords: [number, number],
  reference: [number, number],
  maxKm = 150
): boolean {
  return haversineKm(coords, reference) <= maxKm;
}

// ── Simple in-memory cache ──────────────────────────────────────────────────
const geocodeCache = new Map<string, [number, number] | null>();

/**
 * Geocode via Mapbox Geocoding API.  Returns [lng, lat] or null.
 * @param proximity - Optional [lng, lat] to bias results toward (critical for accuracy)
 */
async function geocodePlace(
  placeName: string,
  regionBias?: string,
  proximity?: [number, number]
): Promise<[number, number] | null> {
  if (!MAPBOX_TOKEN) return null;

  const cacheKey = `${placeName}|${regionBias ?? ""}|${proximity?.join(",") ?? ""}`;
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey)!;

  try {
    const query = regionBias ? `${placeName}, ${regionBias}` : placeName;
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      limit: "1",
      types: "poi,poi.landmark,address,place,locality,neighborhood",
    });
    // Use proximity bias — this makes Mapbox return the closest match to the destination
    if (proximity) {
      params.set("proximity", `${proximity[0]},${proximity[1]}`);
    }

    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`
    );
    const data = await res.json();

    if (data.features?.[0]) {
      const [lng, lat] = data.features[0].center;
      const coords: [number, number] = [lng, lat];
      geocodeCache.set(cacheKey, coords);
      return coords;
    }

    geocodeCache.set(cacheKey, null);
  } catch (err) {
    console.warn("[geocoding] Failed for:", placeName, err);
  }
  return null;
}

/** Geocode the destination city — returns [lng, lat] */
export async function geocodeDestination(
  destination: string
): Promise<[number, number] | null> {
  return geocodePlace(destination);
}

export interface PlaceSuggestion {
  name: string;
  fullName: string;
  coordinates: [number, number];
}

/** Autocomplete search for places via Google Places Autocomplete (proxied) */
export async function searchPlaces(
  query: string,
  limit = 5
): Promise<PlaceSuggestion[]> {
  if (!query.trim()) return [];

  try {
    const params = new URLSearchParams({
      input: query.trim(),
      limit: String(limit),
    });

    const res = await fetch(`/api/places/autocomplete?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data ?? [];
  } catch {
    return [];
  }
}

/**
 * Verify LLM-provided coordinates via Mapbox Geocoding.
 */
export async function verifyDestinationCoords(
  name: string,
  state: string,
  llmCoords: [number, number]
): Promise<[number, number]> {
  const verified = await geocodePlace(`${name}, ${state}, India`);
  return verified ?? llmCoords;
}

/**
 * Enrich itinerary with accurate coordinates via Mapbox Geocoding.
 */
export async function enrichItineraryWithCoordinates(
  days: ItineraryDay[],
  destination: string
): Promise<ItineraryDay[]> {
  const destCenter = await geocodeDestination(destination);
  if (!destCenter) {
    console.warn("[geocoding] Could not geocode destination:", destination);
    return days;
  }

  console.log("[geocoding] Destination center:", destCenter, "for", destination);

  const enriched = [...days];

  for (let d = 0; d < enriched.length; d++) {
    const day = { ...enriched[d] };
    const enrichedRows = [...day.rows];

    const BATCH = 5;
    for (let i = 0; i < enrichedRows.length; i += BATCH) {
      const batch = enrichedRows.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (row) => {
          if (shouldSkipGeocoding(row.activity)) return null;

          // Always geocode via Mapbox with proximity bias for best accuracy
          const geocoded = await geocodePlace(row.activity, destination, destCenter);
          if (geocoded && isWithinRange(geocoded, destCenter, 300)) {
            return geocoded;
          }

          // Fall back to LLM coordinates if geocoding fails but they're in range
          if (row.coordinates && isWithinRange(row.coordinates, destCenter, 300)) {
            return row.coordinates;
          }

          return null;
        })
      );

      results.forEach((coords, idx) => {
        enrichedRows[i + idx] = {
          ...enrichedRows[i + idx],
          coordinates: coords ?? undefined,
        };
      });
    }

    day.rows = enrichedRows;

    const validCoords = enrichedRows
      .filter((r) => r.coordinates)
      .map((r) => r.coordinates as [number, number]);

    if (validCoords.length > 0) {
      const avgLng = validCoords.reduce((s, c) => s + c[0], 0) / validCoords.length;
      const avgLat = validCoords.reduce((s, c) => s + c[1], 0) / validCoords.length;
      day.coordinates = [avgLng, avgLat];
    } else {
      day.coordinates = destCenter;
    }

    enriched[d] = day;
  }

  return enriched;
}

/** Convert enriched itinerary to MapMarker array */
export function itineraryToMarkers(days: ItineraryDay[]): MapMarker[] {
  const markers: MapMarker[] = [];

  days.forEach((day, dayIndex) => {
    day.rows.forEach((row, activityIndex) => {
      if (!row.coordinates) return;
      markers.push({
        id: row.id ?? uid(),
        coordinates: row.coordinates,
        label: row.activity,
        dayIndex,
        activityIndex,
        pricing: row.pricing,
        time: row.time,
        type: "activity",
      });
    });
  });

  return markers;
}

