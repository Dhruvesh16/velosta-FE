import { NextRequest, NextResponse } from "next/server";
import { getGoogleMapsServerKey } from "@/lib/google-maps-server-key";

/**
 * Proxies Google Places photo requests to avoid CORS/referrer issues.
 * Query params:
 *   ref - the photo_reference from Google Places API
 *   maxwidth - optional max width (default 400)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ref = searchParams.get("ref");
  const maxwidth = searchParams.get("maxwidth") || "400";
  const GOOGLE_KEY = getGoogleMapsServerKey();

  if (!ref || !GOOGLE_KEY) {
    return new NextResponse("Missing params", { status: 400 });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${ref}&key=${GOOGLE_KEY}`;

    const res = await fetch(url, { redirect: "follow" });

    if (!res.ok) {
      return new NextResponse("Photo not found", { status: 404 });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch {
    return new NextResponse("Failed to fetch photo", { status: 500 });
  }
}
