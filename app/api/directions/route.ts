import { NextRequest, NextResponse } from "next/server";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/**
 * Fetch a route from Mapbox Directions API.
 * Accepts coordinates as waypoints and returns road-following geometry.
 * 
 * Query params:
 *   coords - semicolon-separated lng,lat pairs (e.g. "73.8567,15.4909;73.9513,15.3456")
 *   profile - optional: "driving" (default), "walking", "cycling"
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const coords = searchParams.get("coords");
  const profile = searchParams.get("profile") || "driving";

  if (!coords || !MAPBOX_TOKEN) {
    return NextResponse.json({ error: "Missing coords or token" }, { status: 400 });
  }

  const validProfiles = ["driving", "walking", "cycling", "driving-traffic"];
  const safeProfile = validProfiles.includes(profile) ? profile : "driving";

  // Mapbox Directions supports max 25 waypoints per request
  const waypoints = coords.split(";").filter(Boolean);
  if (waypoints.length < 2) {
    return NextResponse.json({ error: "Need at least 2 waypoints" }, { status: 400 });
  }

  try {
    const MAX_WAYPOINTS = 25;
    let fullGeometry: [number, number][] = [];

    for (let i = 0; i < waypoints.length - 1; i += MAX_WAYPOINTS - 1) {
      const chunk = waypoints.slice(i, i + MAX_WAYPOINTS);
      if (chunk.length < 2) break;

      const coordStr = chunk.join(";");
      // Try preferred profile first
      let url = `https://api.mapbox.com/directions/v5/mapbox/${safeProfile}/${coordStr}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

      let res = await fetch(url);
      let data = await res.json();

      // If driving fails (e.g. no road access), fallback to walking
      if (data.code !== "Ok" && safeProfile === "driving") {
        url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordStr}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
        res = await fetch(url);
        data = await res.json();
      }

      if (data.code !== "Ok" || !data.routes?.[0]) {
        continue;
      }

      const routeCoords = data.routes[0].geometry.coordinates as [number, number][];

      // Avoid duplicate point at stitch boundary
      if (fullGeometry.length > 0) {
        fullGeometry = fullGeometry.concat(routeCoords.slice(1));
      } else {
        fullGeometry = routeCoords;
      }
    }

    if (fullGeometry.length < 2) {
      return NextResponse.json({ geometry: null, distance: 0, duration: 0 });
    }

    return NextResponse.json({
      geometry: {
        type: "LineString",
        coordinates: fullGeometry,
      },
    });
  } catch (err) {
    console.error("[api/directions] error:", err);
    return NextResponse.json({ error: "Failed to fetch directions" }, { status: 500 });
  }
}
