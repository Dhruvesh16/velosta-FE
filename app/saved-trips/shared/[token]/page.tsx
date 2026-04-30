"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@/app/utils/context";
import { getSharedTrip, type SharedTripRecord } from "@/lib/services/trips-service";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type SnapshotRow = {
  activity?: string;
  description?: string;
  time?: string;
  lat?: number | string;
  lng?: number | string;
  coordinates?: [number, number];
};

type SnapshotDay = {
  day?: number | string;
  theme?: string;
  rows?: SnapshotRow[];
};

type ParsedStop = {
  id: string;
  day: number;
  rowIndex: number;
  activity: string;
  description: string;
  time: string;
  coordinates: [number, number];
};

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

function isValidLngLat([lng, lat]: [number, number]): boolean {
  return Number.isFinite(lng) && Number.isFinite(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const q =
    s1 * s1 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * s2 * s2;
  return 6371 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

function sanitizeStops(rawStops: ParsedStop[]): ParsedStop[] {
  const valid = rawStops.filter((s) => isValidLngLat(s.coordinates));
  if (valid.length <= 2) return valid;

  // Robust center using medians to reduce impact from outliers.
  const lngs = valid.map((s) => s.coordinates[0]).sort((a, b) => a - b);
  const lats = valid.map((s) => s.coordinates[1]).sort((a, b) => a - b);
  const mid = Math.floor(valid.length / 2);
  const center: [number, number] = [lngs[mid], lats[mid]];

  const distances = valid
    .map((s) => haversineKm(center, s.coordinates))
    .sort((a, b) => a - b);
  const p75 = distances[Math.floor(distances.length * 0.75)] ?? 0;
  // Adaptive cap: handles city trips while still allowing multi-city plans.
  const distanceCapKm = Math.max(25, Math.min(300, p75 * 2.5 || 80));

  const cleaned = valid.filter((s) => haversineKm(center, s.coordinates) <= distanceCapKm);
  return cleaned.length >= 2 ? cleaned : valid;
}

function parseSnapshot(snapshot: Record<string, unknown> | undefined): ParsedStop[] {
  const raw = (snapshot?.itineraryData as Record<string, unknown> | undefined)?.itineraryTable;
  if (!Array.isArray(raw)) return [];
  const stops: ParsedStop[] = [];
  raw.forEach((d, dIdx) => {
    const dayObj = (d || {}) as SnapshotDay;
    const day = num(dayObj.day) ?? dIdx + 1;
    const rows = Array.isArray(dayObj.rows) ? dayObj.rows : [];
    rows.forEach((r, rIdx) => {
      const row = (r || {}) as SnapshotRow;
      const lat = num(row.lat);
      const lng = num(row.lng);
      const coord = Array.isArray(row.coordinates) && row.coordinates.length === 2 ? row.coordinates : null;
      const coordinates: [number, number] | null =
        coord && Number.isFinite(coord[0]) && Number.isFinite(coord[1])
          ? // Snapshot payloads may carry either [lng,lat] or [lat,lng].
            // Pick the variant that forms a valid lng/lat pair.
            (isValidLngLat([coord[0], coord[1]])
              ? [coord[0], coord[1]]
              : isValidLngLat([coord[1], coord[0]])
              ? [coord[1], coord[0]]
              : null)
          : lat !== null && lng !== null
          ? [lng, lat]
          : null;
      if (!coordinates) return;
      stops.push({
        id: `${day}-${rIdx}-${row.activity || "stop"}`,
        day,
        rowIndex: rIdx,
        activity: row.activity || "Activity",
        description: row.description || "",
        time: row.time || "",
        coordinates,
      });
    });
  });
  // Keep original itinerary order after cleaning.
  return sanitizeStops(stops).sort((a, b) => (a.day - b.day) || (a.rowIndex - b.rowIndex));
}

export default function SharedTripPage() {
  const params = useParams<{ token: string }>();
  const { accessToken, loading } = useUser();
  const [trip, setTrip] = useState<SharedTripRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const stops = useMemo(() => parseSnapshot(trip?.tripSnapshot), [trip?.tripSnapshot]);
  const stopsByDay = useMemo(() => {
    const byDay = new Map<number, ParsedStop[]>();
    stops.forEach((s) => {
      byDay.set(s.day, [...(byDay.get(s.day) || []), s]);
    });
    return [...byDay.entries()].sort((a, b) => a[0] - b[0]);
  }, [stops]);

  useEffect(() => {
    if (!accessToken || !params?.token) return;
    getSharedTrip(params.token)
      .then((d) => setTrip(d.sharedTrip))
      .catch((e) => setError(e?.message || "Unable to load shared trip"));
  }, [accessToken, params?.token]);

  useEffect(() => {
    if (!trip || !mapContainerRef.current || stops.length === 0 || mapRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
    if (!token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: stops[0].coordinates,
      zoom: 11,
    });
    mapRef.current = map;

    map.on("load", () => {
      const bounds = new mapboxgl.LngLatBounds();
      stops.forEach((s) => {
        bounds.extend(s.coordinates);
        const marker = document.createElement("div");
        marker.className = "h-3.5 w-3.5 rounded-full border-2 border-white bg-[#D97757] shadow";
        new mapboxgl.Marker({ element: marker }).setLngLat(s.coordinates).addTo(map);
      });
      if (stops.length > 1) {
        const dayColors = ["#2F6F73", "#D97757", "#7A4A36", "#3A6A4E", "#2A3A52", "#A88452"];
        const grouped = new Map<number, ParsedStop[]>();
        stops.forEach((s) => grouped.set(s.day, [...(grouped.get(s.day) || []), s]));

        [...grouped.entries()]
          .sort((a, b) => a[0] - b[0])
          .forEach(([day, dayStops], idx) => {
            if (dayStops.length < 2) return;
            const sourceId = `route-day-${day}`;
            const layerId = `route-day-line-${day}`;
            map.addSource(sourceId, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: dayStops.map((s) => s.coordinates),
                },
              },
            });
            map.addLayer({
              id: layerId,
              type: "line",
              source: sourceId,
              paint: {
                "line-color": dayColors[idx % dayColors.length],
                "line-width": 3.5,
                "line-opacity": 0.82,
              },
            });
          });

        map.fitBounds(bounds, { padding: 60, duration: 0 });
      } else {
        map.flyTo({ center: stops[0].coordinates, zoom: 13, duration: 0 });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [trip, stops]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!accessToken) return <div className="p-6">Please sign in to view this shared trip.</div>;
  if (error) return <div className="p-6">{error}</div>;
  if (!trip) return <div className="p-6">Loading trip…</div>;

  return (
    <main className="min-h-screen bg-[#FBF8F3] p-4 md:p-6">
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        <section className="bg-white border border-[#0B1F2A]/10 rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
          <h1 className="text-2xl font-semibold text-[#0B1F2A]">{trip.title}</h1>
          <p className="text-xs text-[#0B1F2A]/50 mt-1">Shared itinerary map</p>
          {stopsByDay.length === 0 ? (
            <p className="text-sm text-[#0B1F2A]/60 mt-4">No mappable stops found for this trip.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {stopsByDay.map(([day, rows]) => (
                <div key={day} className="rounded-xl border border-[#0B1F2A]/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#2F6F73]">Day {day}</p>
                  <div className="mt-2 space-y-2">
                    {rows.map((r) => (
                      <div key={r.id} className="text-sm">
                        <p className="font-medium text-[#0B1F2A]">
                          {r.time ? `${r.time} · ` : ""}
                          {r.activity}
                        </p>
                        {r.description ? <p className="text-[#0B1F2A]/60 text-xs mt-0.5">{r.description}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-[#0B1F2A]/10 rounded-2xl overflow-hidden min-h-[520px]">
          {stops.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[#0B1F2A]/60 text-sm">
              Map unavailable for this snapshot.
            </div>
          ) : (
            <div ref={mapContainerRef} className="w-full h-[75vh]" />
          )}
        </section>
      </div>
    </main>
  );
}

