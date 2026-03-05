"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from "@react-google-maps/api";
import { motion } from "framer-motion";
import { useMapStore } from "@/lib/stores/map-store";
import { usePlannerStore } from "@/lib/stores/planner-store";
import MapScoreBadge from "./map-score-badge";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

const DAY_COLORS = [
  "#2563EB", "#7C3AED", "#22D3EE", "#16A34A",
  "#F59E0B", "#EA580C", "#DC2626", "#0891B2",
];

function getDayColor(i: number): string {
  return DAY_COLORS[i % DAY_COLORS.length];
}

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#dbeafe" }] },
  { featureType: "landscape.natural", elementType: "geometry.fill", stylers: [{ color: "#fef9f0" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#fde68a" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#f59e0b" }] },
];

const containerStyle = { width: "100%", height: "100%" };

export default function MapPanel() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const { viewport, markers, activeMarkerId, setMapReady, setActiveMarker } = useMapStore();
  const { itinerary, activeDay, setActiveDay } = usePlannerStore();
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_KEY,
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);
  }, [setMapReady]);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // ── Fly to viewport changes ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.panTo({ lat: viewport.latitude, lng: viewport.longitude });
    map.setZoom(viewport.zoom);
  }, [viewport]);

  // ── Fly to active day ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const day = itinerary[activeDay];
    if (!map || !day?.coordinates) return;
    map.panTo({ lat: day.coordinates[1], lng: day.coordinates[0] });
    map.setZoom(14);
  }, [activeDay, itinerary]);

  // Build per-day polyline paths
  const dayPolylines = itinerary.map((day, dayIndex) => {
    const path = day.rows
      .filter((r) => r.coordinates)
      .map((r) => ({ lat: r.coordinates![1], lng: r.coordinates![0] }));
    return { path, color: getDayColor(dayIndex), dayIndex };
  }).filter((p) => p.path.length >= 2);

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: "#FFF9F3" }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-xs">Loading map...</p>
        </div>
      </div>
    );
  }

  if (!GOOGLE_KEY) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: "#FFF9F3" }}>
        <div className="bg-white border border-amber-200 rounded-2xl text-center p-8 max-w-sm mx-4 shadow-lg">
          <div className="text-4xl mb-4">🗺️</div>
          <h3 className="text-gray-800 font-semibold mb-2 text-sm">Map Not Available</h3>
          <p className="text-xs leading-relaxed text-gray-500">
            Add <code className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> to your <code>.env.local</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="relative w-full h-full overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat: viewport.latitude, lng: viewport.longitude }}
        zoom={viewport.zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: MAP_STYLES,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
        }}
      >
        {/* Per-day route polylines */}
        {dayPolylines.map((dp) => (
          <Polyline
            key={`route-${dp.dayIndex}`}
            path={dp.path}
            options={{
              strokeColor: dp.color,
              strokeOpacity: 0.7,
              strokeWeight: 3,
              geodesic: true,
            }}
          />
        ))}

        {/* Activity markers */}
        {markers.map((md) => {
          const color = getDayColor(md.dayIndex);
          const isActive = md.id === activeMarkerId;

          return (
            <Marker
              key={md.id}
              position={{ lat: md.coordinates[1], lng: md.coordinates[0] }}
              onClick={() => {
                setActiveMarker(md.id);
                setActiveDay(md.dayIndex);
                mapRef.current?.panTo({ lat: md.coordinates[1], lng: md.coordinates[0] });
                mapRef.current?.setZoom(15);
              }}
              onMouseOver={() => setHoveredMarker(md.id)}
              onMouseOut={() => setHoveredMarker(null)}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: isActive ? 10 : 7,
                fillColor: color,
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              }}
              label={{
                text: `${md.dayIndex + 1}`,
                color: "#ffffff",
                fontSize: "9px",
                fontWeight: "bold",
              }}
            />
          );
        })}

        {/* Hover info window */}
        {hoveredMarker && (() => {
          const md = markers.find((m) => m.id === hoveredMarker);
          if (!md) return null;
          const color = getDayColor(md.dayIndex);
          return (
            <InfoWindow
              position={{ lat: md.coordinates[1], lng: md.coordinates[0] }}
              options={{ disableAutoPan: true, pixelOffset: new google.maps.Size(0, -12) }}
              onCloseClick={() => setHoveredMarker(null)}
            >
              <div style={{ fontFamily: "Inter, sans-serif", minWidth: 140, padding: "2px" }}>
                <div style={{ fontSize: 11, color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  Day {md.dayIndex + 1}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#1f2937", marginBottom: 4 }}>
                  {md.label}
                </div>
                {md.time && <div style={{ fontSize: 11, color: "#9ca3af" }}>🕐 {md.time}</div>}
                {md.pricing && <div style={{ fontSize: 11, color: "#D97706", fontWeight: 600, marginTop: 2 }}>{md.pricing}</div>}
              </div>
            </InfoWindow>
          );
        })()}
      </GoogleMap>

      {/* Edge gradient blends */}
      <div className="absolute left-0 top-0 bottom-0 w-4 pointer-events-none" style={{ background: "linear-gradient(to right,rgba(245,240,232,0.5),transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-4 pointer-events-none" style={{ background: "linear-gradient(to left,rgba(245,240,232,0.5),transparent)" }} />

      <MapScoreBadge />
    </motion.div>
  );
}
