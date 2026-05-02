import { NextRequest, NextResponse } from "next/server";
import { getGoogleMapsServerKey } from "@/lib/google-maps-server-key";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const input = searchParams.get("input");
  const limit = parseInt(searchParams.get("limit") || "5", 10);

  const GOOGLE_KEY = getGoogleMapsServerKey();

  if (!input?.trim() || !GOOGLE_KEY) {
    console.error(
      "[api/places/autocomplete] GOOGLE_MAPS_KEY is empty — check Cloud Run secret binding google-maps-key → GOOGLE_MAPS_KEY (production) or .env.local (dev)."
    );
    return NextResponse.json([], { status: 200 });
  }

  try {
    const base = "https://maps.googleapis.com/maps/api/place/autocomplete/json";

    const runAutocomplete = async (types?: string) => {
      const acUrl = new URL(base);
      acUrl.searchParams.set("input", input.trim());
      acUrl.searchParams.set("key", GOOGLE_KEY);
      if (types) acUrl.searchParams.set("types", types);
      const acRes = await fetch(acUrl.toString());
      return acRes.json() as Promise<{
        status: string;
        error_message?: string;
        predictions?: Array<{
          place_id: string;
          structured_formatting: {
            main_text: string;
            secondary_text?: string;
          };
          description: string;
        }>;
      }>;
    };

    // Prefer regions/countries/localities — if Google returns none, widen search.
    let acData = await runAutocomplete("(regions)");
    if (acData.status !== "OK" || !acData.predictions?.length) {
      acData = await runAutocomplete();
    }

    if (acData.status !== "OK" || !acData.predictions?.length) {
      console.warn(
        "[api/places/autocomplete] Google Places autocomplete:",
        acData.status,
        acData.error_message ?? "(no error_message)"
      );
      return NextResponse.json([]);
    }

    const predictions = acData.predictions.slice(0, limit);

    // Step 2: Get coordinates for each prediction via Place Details
    const results = await Promise.all(
      predictions.map(
        async (p: {
          place_id: string;
          structured_formatting: {
            main_text: string;
            secondary_text?: string;
          };
          description: string;
        }) => {
          try {
            const detailUrl = new URL(
              "https://maps.googleapis.com/maps/api/place/details/json"
            );
            detailUrl.searchParams.set("place_id", p.place_id);
            detailUrl.searchParams.set("fields", "geometry");
            detailUrl.searchParams.set("key", GOOGLE_KEY);

            const detailRes = await fetch(detailUrl.toString());
            const detailData = await detailRes.json();
            const loc = detailData.result?.geometry?.location;

            if (!loc) return null;

            return {
              name: p.structured_formatting.main_text,
              fullName: p.description,
              coordinates: [loc.lng, loc.lat] as [number, number],
            };
          } catch {
            return null;
          }
        }
      )
    );

    return NextResponse.json(results.filter(Boolean));
  } catch (err) {
    console.error("[api/places/autocomplete] error:", err);
    return NextResponse.json([], { status: 500 });
  }
}
