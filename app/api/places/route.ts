import { NextRequest, NextResponse } from "next/server";

// Server-side only — do NOT use NEXT_PUBLIC_ prefix here
const GOOGLE_KEY = process.env.GOOGLE_MAPS_KEY ?? "";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get("name");
  const lng = searchParams.get("lng");
  const lat = searchParams.get("lat");
  const destination = searchParams.get("destination") || "";

  if (!name || !lng || !lat || !GOOGLE_KEY) {
    return NextResponse.json(null, { status: 400 });
  }

  // Skip generic activity names — these will only resolve to a random
  // business near the bias point, polluting the marker positions.
  const generic = /^(breakfast|lunch|dinner|brunch|snack|meal|return to|check[- ]?(in|out)|free time|rest|transfer|arrive|depart)\b|\b(at )?hotel\s*$|\bscenic\s+spot\b/i;
  if (generic.test(name.trim()) || name.trim().length < 6) {
    return NextResponse.json(null);
  }

  try {
    // Step 1: Text Search to find the place. 25 km radius gives enough
    // coverage for island-hopping itineraries (e.g. Havelock Island is
    // ~37 km from Port Blair) without pulling POIs from neighboring cities.
    const query = destination ? `${name}, ${destination}` : name;
    const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    searchUrl.searchParams.set("query", query);
    searchUrl.searchParams.set("location", `${lat},${lng}`);
    searchUrl.searchParams.set("radius", "25000");
    searchUrl.searchParams.set("key", GOOGLE_KEY);

    const searchRes = await fetch(searchUrl.toString());
    const searchData = await searchRes.json();

    if (searchData.status !== "OK" || !searchData.results?.[0]) {
      return NextResponse.json(null);
    }

    const place = searchData.results[0];
    const placeId = place.place_id;

    // Step 2: Place Details for richer data + photos
    const detailUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    detailUrl.searchParams.set("place_id", placeId);
    detailUrl.searchParams.set(
      "fields",
      "name,rating,user_ratings_total,types,photos,website,formatted_phone_number,formatted_address,opening_hours,geometry"
    );
    detailUrl.searchParams.set("key", GOOGLE_KEY);

    const detailRes = await fetch(detailUrl.toString());
    const detailData = await detailRes.json();
    const result = detailData.result ?? place;

    // Build photo URLs via our proxy (up to 5)
    const photos: string[] = (result.photos ?? place.photos ?? [])
      .slice(0, 5)
      .map(
        (p: { photo_reference: string }) =>
          `/api/places/photo?ref=${encodeURIComponent(p.photo_reference)}&maxwidth=600`
      );

    // Precise location from Google (much more accurate than Mapbox geocoding for POIs)
    const geo = result.geometry?.location ?? place.geometry?.location;
    const location =
      geo && typeof geo.lat === "number" && typeof geo.lng === "number"
        ? { lat: geo.lat, lng: geo.lng }
        : null;

    return NextResponse.json({
      placeId,
      name: result.name ?? name,
      rating: result.rating ?? place.rating,
      userRatingsTotal: result.user_ratings_total ?? place.user_ratings_total,
      types: result.types ?? place.types,
      photos,
      website: result.website,
      phone: result.formatted_phone_number,
      address: result.formatted_address ?? place.formatted_address,
      openNow: result.opening_hours?.open_now,
      location,
    });
  } catch (err) {
    console.error("[api/places] error:", err);
    return NextResponse.json(null, { status: 500 });
  }
}
