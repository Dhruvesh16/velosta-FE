// ── Google Places Service ──────────────────────────────────────────────────────
// Fetches place details (photos, ratings, reviews) via our Next.js API route
// which proxies Google Places API server-side (avoids CORS issues).

export interface PlaceDetails {
  placeId: string;
  name: string;
  rating?: number;
  userRatingsTotal?: number;
  types?: string[];
  photos: string[];
  website?: string;
  phone?: string;
  address?: string;
  openNow?: boolean;
  /** Precise [lng, lat] from Google Places (much more accurate than Mapbox for Indian POIs) */
  location?: [number, number];
}

const placeCache = new Map<string, PlaceDetails | null>();

/**
 * Search for a place near given coordinates and return details + photos.
 */
export async function fetchPlaceDetails(
  placeName: string,
  coordinates: [number, number],
  destination?: string
): Promise<PlaceDetails | null> {
  const cacheKey = `${placeName}|${coordinates.join(",")}`;
  if (placeCache.has(cacheKey)) return placeCache.get(cacheKey)!;

  try {
    const params = new URLSearchParams({
      name: placeName,
      lng: String(coordinates[0]),
      lat: String(coordinates[1]),
    });
    if (destination) params.set("destination", destination);

    const res = await fetch(`/api/places?${params}`);
    if (!res.ok) {
      placeCache.set(cacheKey, null);
      return null;
    }

    const data = await res.json();
    if (!data) {
      placeCache.set(cacheKey, null);
      return null;
    }

    const details: PlaceDetails = {
      placeId: data.placeId,
      name: data.name ?? placeName,
      rating: data.rating,
      userRatingsTotal: data.userRatingsTotal,
      types: data.types,
      photos: data.photos ?? [],
      website: data.website,
      phone: data.phone,
      address: data.address,
      openNow: data.openNow,
      location:
        data.location && typeof data.location.lat === "number" && typeof data.location.lng === "number"
          ? [data.location.lng, data.location.lat]
          : undefined,
    };

    placeCache.set(cacheKey, details);
    return details;
  } catch (err) {
    console.warn("[google-places] Failed for:", placeName, err);
    placeCache.set(cacheKey, null);
    return null;
  }
}

/** Format place type for display */
export function formatPlaceType(types?: string[]): string {
  if (!types?.length) return "Place";
  const typeMap: Record<string, string> = {
    tourist_attraction: "Tourist Attraction",
    point_of_interest: "Point of Interest",
    establishment: "Establishment",
    lodging: "Hotel",
    restaurant: "Restaurant",
    museum: "Museum",
    park: "Park",
    place_of_worship: "Temple/Shrine",
    hindu_temple: "Hindu Temple",
    church: "Church",
    mosque: "Mosque",
    shopping_mall: "Shopping",
    natural_feature: "Natural Feature",
    beach: "Beach",
    campground: "Campground",
    amusement_park: "Amusement Park",
    zoo: "Zoo",
    aquarium: "Aquarium",
    art_gallery: "Art Gallery",
    spa: "Spa",
    cafe: "Café",
    bar: "Bar",
    night_club: "Nightclub",
  };
  for (const t of types) {
    if (typeMap[t]) return typeMap[t];
  }
  return types[0]?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Place";
}
