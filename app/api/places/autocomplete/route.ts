import { NextRequest, NextResponse } from "next/server";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const input = searchParams.get("input");
  const limit = parseInt(searchParams.get("limit") || "5", 10);

  if (!input || !GOOGLE_KEY) {
    return NextResponse.json([], { status: 400 });
  }

  try {
    // Step 1: Get autocomplete predictions
    const acUrl = new URL(
      "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    );
    acUrl.searchParams.set("input", input);
    acUrl.searchParams.set("types", "(regions)");
    acUrl.searchParams.set("key", GOOGLE_KEY);

    const acRes = await fetch(acUrl.toString());
    const acData = await acRes.json();

    if (acData.status !== "OK" || !acData.predictions?.length) {
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
