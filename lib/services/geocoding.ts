// ── Google Maps Geocoding Service ─────────────────────────────────────────────
// Uses Google Geocoding API for accurate place resolution.
// All coordinates are [lng, lat] internally for consistency with map stores.

import type { ItineraryDay, MapMarker } from "@/lib/types/planner.types";

/** Simple unique ID generator */
function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

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
  /breakfast\s+at\s+(hotel|stay)/i,
  /\bhotel\b/i,
  /\bhomestay\b/i,
  /on\s+the\s+way/i,
  /freshen\s+up/i,
  /\bleisure\b/i,
  /\bsleep\b/i,
  /\brelax\b/i,
  /\bdinner\s+at/i,
  /\blunch\s+at/i,
  /\bbreakfast\b/i,
  /\bsnacks?\b/i,
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
 * Geocode via Google Geocoding API.  Returns [lng, lat] or null.
 */
async function geocodePlace(
  placeName: string,
  regionBias?: string
): Promise<[number, number] | null> {
  if (!GOOGLE_KEY) return null;

  const cacheKey = `${placeName}|${regionBias ?? ""}`;
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey)!;

  try {
    const params = new URLSearchParams({
      address: regionBias ? `${placeName}, ${regionBias}` : placeName,
      key: GOOGLE_KEY,
      region: "in",
    });

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`
    );
    const data = await res.json();

    if (data.status === "OK" && data.results?.[0]) {
      const loc = data.results[0].geometry.location;
      const coords: [number, number] = [loc.lng, loc.lat];
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

/**
 * Verify LLM-provided coordinates via Google Geocoding.
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
 * Enrich itinerary with accurate coordinates via Google Geocoding.
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

          // Validate existing LLM coordinates
          if (row.coordinates && isWithinRange(row.coordinates, destCenter, 150)) {
            return row.coordinates;
          }

          // Geocode via Google
          const geocoded = await geocodePlace(row.activity, destination);
          if (geocoded && isWithinRange(geocoded, destCenter, 150)) {
            return geocoded;
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

