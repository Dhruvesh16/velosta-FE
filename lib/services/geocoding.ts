// ── Mapbox Geocoding Service ──────────────────────────────────────────────────
// Uses Mapbox Geocoding API for accurate place resolution.
// All coordinates are [lng, lat] internally for consistency with map stores.

import type { ItineraryDay, MapMarker } from "@/lib/types/planner.types";

/** Simple unique ID generator */
function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/** fetch() with a hard timeout so blocked/slow requests never hang forever */
async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = 6000
): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

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

// Extracted venue names that are too generic to geocode reliably — they would
// match arbitrary nearby POIs instead of real specific places.
const GENERIC_VENUE_RE = /^(resort|hotel|lodge|inn|homestay|guesthouse|guest\s+house|hostel|(local\s+)?(restaurant|cafe|cafeteria|dhaba|shack|bar|pub|eatery|diner|canteen|caterer)|beach\s+(shack|cafe|bar|restaurant|hut)|local\s+village|village|market)$/i;

function shouldSkipGeocoding(name: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(name));
}

function isGenericVenue(venue: string): boolean {
  return GENERIC_VENUE_RE.test(venue.trim());
}

// ── Extract the venue from prose like "Sunrise at Triveni Ghat" ──────────────
// LLM activity strings frequently bury the actual landmark behind verbs and
// meal-time nouns. Geocoders match the leading verb ("Lunch", "Sunrise",
// "Visit") instead of the venue, landing the marker on a random restaurant
// or generic locality. We strip those prefixes and prefer the slice after
// " at " / " in " / " near ", which is almost always the actual place name.
const LEADING_VERB = new RegExp(
  "^(?:enjoy|experience|visit|explore|discover|tour|see|watch|attend|photograph|witness|take|join|relax|stroll|walk(?: through| around)?|hike(?: to| up| in)?|trek(?: to| up| in)?|drive(?: to| through)?|ride(?: to| through)?|swim(?: at| in)?|shop(?: at| in)?|cycling(?: at| in)?|kayak(?: at| in)?|raft(?:ing)?(?: at| in| on)?)\s+",
  "i"
);
const MEAL_PREFIX = /^(?:breakfast|brunch|lunch|dinner|snack|coffee|tea|sunrise|sunset|stargazing|night\s*walk|morning\s*walk|evening\s*walk)\s+(?:at|in|near|by)\s+/i;
const PARENS = /\s*[\(\[][^\)\]]*[\)\]]/g;

function extractVenueName(activity: string): string {
  let s = activity.trim().replace(PARENS, "").trim();
  // "X at Y" / "X in Y" / "X near Y" → keep the part after the connector
  const at = s.match(/\b(?:at|in|near|by)\s+(.+)$/i);
  if (at && at[1].trim().length >= 3) {
    s = at[1].trim();
  } else {
    s = s.replace(MEAL_PREFIX, "").replace(LEADING_VERB, "").trim();
  }
  // Drop trailing punctuation / hyphenated descriptors after a dash
  s = s.split(/\s+[-–—]\s+/)[0].trim();
  return s.length >= 3 ? s : activity.trim();
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
// Resolved country-code cache (keyed by raw destination string)
const destCountryCache = new Map<string, string | null>();

/**
 * Geocode via Mapbox Geocoding API. Returns [lng, lat] or null.
 *
 *  Country bias rules (single source of truth — every caller goes through here):
 *    • countryCode === undefined  → NO bias (worldwide). This is the new safe
 *      default. Mapbox is excellent at disambiguating well-known place names
 *      (Tokyo, Paris, Goa) without help; forcing `country=in` was returning
 *      fuzzy India matches for international destinations.
 *    • countryCode === ""         → explicitly NO bias (same as undefined,
 *      kept for call-site clarity).
 *    • countryCode === "in"/"jp"… → restrict matches to that ISO code.
 */
async function geocodePlace(
  placeName: string,
  regionBias?: string,
  proximity?: [number, number],
  countryCode?: string
): Promise<[number, number] | null> {
  if (!MAPBOX_TOKEN) return null;

  const cc = countryCode?.toLowerCase() ?? "";
  const cacheKey = `${placeName}|${regionBias ?? ""}|${proximity?.join(",") ?? ""}|${cc}`;
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey)!;

  try {
    const query = regionBias ? `${placeName}, ${regionBias}` : placeName;
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      limit: "1",
      types: "poi,poi.landmark,address,place,locality,neighborhood",
    });
    if (proximity) params.set("proximity", `${proximity[0]},${proximity[1]}`);
    if (cc) params.set("country", cc);

    const res = await fetchWithTimeout(
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

/** Like geocodePlace but also returns the resolved ISO country code from
 *  the Mapbox feature `context`. Used by `geocodeDestination` so we can
 *  thread the right country bias into per-row enrichment.
 */
async function geocodePlaceWithCountry(
  placeName: string,
  countryCode?: string
): Promise<{ coords: [number, number]; country: string | null } | null> {
  if (!MAPBOX_TOKEN) return null;
  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      limit: "1",
      // Include `district` — Mapbox classifies Indian Union Territories (e.g.
      // Andaman & Nicobar Islands, Lakshadweep) as `district`, not `region`.
      // Without this, querying "Andaman Islands" returns null, causing the
      // enrichment pipeline to fall back to unverified LLM coordinates.
      types: "country,region,district,place,locality,neighborhood,poi.landmark",
    });
    const cc = countryCode?.toLowerCase();
    if (cc) params.set("country", cc);
    const res = await fetchWithTimeout(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(placeName)}.json?${params}`
    );
    const data = await res.json();
    const feat = data.features?.[0];
    if (!feat) return null;
    const [lng, lat] = feat.center;
    // Mapbox `context` is an array of parent regions; the country entry has
    // id like "country.123" and a `short_code` like "jp", "in", "us".
    let country: string | null = null;
    const ctx = Array.isArray(feat.context) ? feat.context : [];
    for (const c of ctx) {
      if (typeof c.id === "string" && c.id.startsWith("country.") && typeof c.short_code === "string") {
        country = c.short_code.toLowerCase();
        break;
      }
    }
    // Top-level result might already BE a country
    if (!country && typeof feat.id === "string" && feat.id.startsWith("country.") && typeof feat.properties?.short_code === "string") {
      country = feat.properties.short_code.toLowerCase();
    }
    return { coords: [lng, lat], country };
  } catch (err) {
    console.warn("[geocoding] geocodePlaceWithCountry failed:", placeName, err);
    return null;
  }
}

/**
 * Query Google Places (proxied) for a precise POI fix. Returns [lng, lat]
 * or null. Google's POI database is meaningfully more accurate than
 * Mapbox's for Indian landmarks (temples, ghats, dhabas, view points).
 */
async function googlePlacesLookup(
  placeName: string,
  proximity: [number, number],
  destination?: string
): Promise<[number, number] | null> {
  if (typeof window === "undefined") return null;
  const cleaned = (placeName || "").trim();
  if (!cleaned) return null;
  const cacheKey = `gp|${placeName}|${proximity.join(",")}|${destination ?? ""}`;
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey)!;
  try {
    const params = new URLSearchParams({
      name: cleaned,
      lng: String(proximity[0]),
      lat: String(proximity[1]),
    });
    if (destination) params.set("destination", destination);
    const res = await fetchWithTimeout(`/api/places?${params}`, {}, 5000);
    if (!res.ok) {
      geocodeCache.set(cacheKey, null);
      return null;
    }
    const data = await res.json();
    const loc = data?.location;
    if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
      const coords: [number, number] = [loc.lng, loc.lat];
      geocodeCache.set(cacheKey, coords);
      return coords;
    }
    geocodeCache.set(cacheKey, null);
  } catch (err) {
    console.warn("[geocoding] google-places lookup failed:", placeName, err);
  }
  return null;
}

/** Geocode the destination string and ALSO return its ISO country code.
 *  The country code is then threaded into per-row enrichment so a Tokyo
 *  trip never accidentally pulls Indian POIs (and vice versa).
 *
 *  Strategy:
 *    1. Worldwide forward geocode (no country bias). Mapbox is excellent at
 *       disambiguating well-known city names. Capture the resolved country.
 *    2. If nothing resolves, split on multi-stop separators and try each
 *       segment worldwide.
 *    3. Last-resort: India bias (preserves accuracy for Indian-only inputs
 *       like "Manali" that have no exact international match).
 */
export async function resolveDestination(
  destination: string
): Promise<{ coords: [number, number]; country: string | null } | null> {
  const raw = destination.trim();
  if (!raw) return null;

  // 1. Worldwide first
  const worldwide = await geocodePlaceWithCountry(raw);
  if (worldwide) {
    destCountryCache.set(raw, worldwide.country);
    return worldwide;
  }

  // 2. Multi-stop split, worldwide each
  const SEPARATOR = /\s*(?:&|\+|,|\bto\b|\bvia\b|\band\b|–|—|\/)\s*/i;
  const segments = raw.split(SEPARATOR).map((s) => s.trim()).filter((s) => s.length >= 2);
  for (const seg of segments) {
    if (seg.toLowerCase() === raw.toLowerCase()) continue;
    const segHit = await geocodePlaceWithCountry(seg);
    if (segHit) {
      destCountryCache.set(raw, segHit.country);
      return segHit;
    }
  }

  // 3. India bias as last resort (legacy input that worldwide search missed)
  const inHit = await geocodePlaceWithCountry(raw, "in");
  if (inHit) {
    destCountryCache.set(raw, inHit.country ?? "in");
    return inHit;
  }

  // 4. Try appending ", India" — island territories and lesser-known Indian
  //    destinations like "Andaman Islands" or "Lakshadweep" are sometimes
  //    found only when the country context is embedded in the query string.
  const withIndia = await geocodePlaceWithCountry(`${raw}, India`, "in");
  if (withIndia) {
    destCountryCache.set(raw, withIndia.country ?? "in");
    return withIndia;
  }

  destCountryCache.set(raw, null);
  return null;
}

/** Geocode the destination city — returns [lng, lat]. Backwards compatible. */
export async function geocodeDestination(
  destination: string
): Promise<[number, number] | null> {
  const r = await resolveDestination(destination);
  return r?.coords ?? null;
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
  llmCoords: [number, number],
  country = "India",
  countryCode?: string
): Promise<[number, number]> {
  const verified = await geocodePlace(
    `${name}, ${state}, ${country}`,
    undefined,
    undefined,
    countryCode
  );
  return verified ?? llmCoords;
}

/**
 * Enrich itinerary with accurate coordinates.
 *
 * Strategy (per row):
 *   1. Build a clean venue query — strip leading verbs / meal prefixes,
 *      prefer the slice after " at … ".
 *   2. Pick a tight proximity bias — prefer the LLM-supplied coord when it
 *      is within `softRadiusKm` of the destination, else dest centre.
 *   3. Try Google Places first (precise for Indian POIs); fall back to
 *      Mapbox geocoding; finally fall back to the LLM coord; finally to
 *      dest centre. Whichever resolves first wins, provided it falls
 *      within `hardRadiusKm` of the destination centre.
 *   4. `hardRadiusKm` auto-expands when the destination string suggests a
 *      multi-stop trip ("Manali to Leh", "Goa & Hampi") so legitimately
 *      distant stops are not discarded.
 */
export async function enrichItineraryWithCoordinates(
  days: ItineraryDay[],
  destination: string
): Promise<ItineraryDay[]> {
  const resolved = await resolveDestination(destination);
  if (!resolved) {
    console.warn("[geocoding] Could not geocode destination:", destination);
    return days;
  }
  const destCenter = resolved.coords;
  // ISO country code of the resolved destination (e.g. "jp" for Tokyo, "in"
  // for Goa). Threaded into per-row geocoding so a Tokyo trip does not pull
  // a fuzzy POI from India just because Mapbox got biased.
  const destCountry = resolved.country ?? undefined;

  // Multi-city / road-trip itineraries ("Manali to Leh") and archipelago /
  // island-chain destinations ("Andaman Islands", "Lakshadweep") need a
  // wider net. Islands can span 200+ km from the destination centroid while
  // still being part of the same trip — 60 km would discard valid results.
  const isMultiStop = /\b(?:to|via|and|&|\+|-|–|—)\b/i.test(destination);
  const isIslandOrRegion = /\b(islands?|archipelago|atolls?|lakshadweep|andaman|maldives|nicobar)\b/i.test(destination);
  const hardRadiusKm = (isMultiStop || isIslandOrRegion) ? 500 : 250;
  const softRadiusKm = (isMultiStop || isIslandOrRegion) ? 500 : 250;

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

          const venue = extractVenueName(row.activity);
          // Skip generic venue names — geocoding "Resort" or "Local Shack"
          // returns a random nearby POI, polluting marker positions.
          if (isGenericVenue(venue)) return null;

          // Only trust the LLM coord as a proximity hint if it is plausibly
          // inside the destination AND in the same country (a Tokyo trip
          // should never be biased by an Indian-coords-leak from the LLM).
          const llmInRange =
            row.coordinates &&
            isWithinRange(row.coordinates, destCenter, softRadiusKm);
          const proximity: [number, number] = llmInRange
            ? (row.coordinates as [number, number])
            : destCenter;

          // 1. Google Places (precise POIs, biased by proximity)
          const gp = await googlePlacesLookup(venue, proximity, destination);
          if (gp && isWithinRange(gp, destCenter, hardRadiusKm)) return gp;

          // 2. Mapbox with the cleaned venue, proximity bias AND the
          //    resolved destination country code.
          const mb = await geocodePlace(venue, destination, proximity, destCountry);
          if (mb && isWithinRange(mb, destCenter, hardRadiusKm)) return mb;

          // 3. LLM coord if it survived the soft filter
          if (llmInRange) return row.coordinates as [number, number];

          // 4. Last resort: return null instead of pinning everything to the
          //    destination centroid. Centroid fallback makes many rows stack
          //    into one point, which breaks map readability and journey tours.
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

