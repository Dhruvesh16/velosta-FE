"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { useMapStore } from "@/lib/stores/map-store";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useUIStore } from "@/lib/stores/ui-store";
import MapScoreBadge from "./map-score-badge";
import PlaceDetailCard from "./place-detail-card";
import { fetchPlaceDetails } from "@/lib/services/google-places";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const DAY_COLORS = [
  "#3B82F6", "#8B5CF6", "#06B6D4", "#22C55E",
  "#F59E0B", "#EF4444", "#EC4899", "#0891B2",
];

const POINT_STYLES: Record<string, { color: string; emoji: string }> = {
  stay: { color: "#3B82F6", emoji: "🏨" },
  activity: { color: "#22C55E", emoji: "🎯" },
  food: { color: "#F97316", emoji: "🍜" },
  scenic: { color: "#8B5CF6", emoji: "📸" },
  meal: { color: "#F97316", emoji: "🍜" },
};

function getDayColor(i: number): string {
  return DAY_COLORS[i % DAY_COLORS.length];
}

// Map styles
const MAP_STYLES = {
  streets: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  dark: "mapbox://styles/mapbox/dark-v11",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
};

type MapStyleKey = keyof typeof MAP_STYLES;
const STYLE_ORDER: MapStyleKey[] = ["streets", "satellite", "dark", "outdoors"];

export default function MapPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const viewportChangeRef = useRef(0);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("streets");
  const markerPhotoCacheRef = useRef<Map<string, string>>(new Map());
  const markerGenRef = useRef(0);

  const { viewport, markers, activeMarkerId, setMapReady, setActiveMarker } = useMapStore();
  const { itinerary, activeDay, setActiveDay } = usePlannerStore();
  const { selectedPackage } = useOnboardingStore();
  const plannerChatOpen = useUIStore((s) => s.plannerChatOpen);

  const initialCenter: [number, number] = useMemo(() => {
    if (selectedPackage) return [selectedPackage.coordinates[0], selectedPackage.coordinates[1]];
    return [viewport.longitude, viewport.latitude];
  }, []);
  const initialZoom = useMemo(() => selectedPackage ? 13 : Math.max(viewport.zoom, 5), []);

  // Fetch road-snapped route
  const fetchRouteCoords = useCallback(async (coords: [number, number][]): Promise<[number, number][] | null> => {
    if (coords.length < 2) return null;
    try {
      const coordStr = coords.map((c) => `${c[0]},${c[1]}`).join(";");
      const res = await fetch(`/api/directions?coords=${encodeURIComponent(coordStr)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.geometry?.coordinates) {
        return data.geometry.coordinates as [number, number][];
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Show current day's markers
  const filteredMarkers = useMemo(() => {
    if (markers.length === 0) return markers;
    return markers.filter((m) => m.dayIndex === activeDay);
  }, [markers, activeDay]);

  // Current day's markers for navigation
  const currentDayMarkers = useMemo(() => {
    const sel = markers.find((m) => m.id === selectedMarker);
    if (!sel) return filteredMarkers;
    return markers.filter((m) => m.dayIndex === sel.dayIndex);
  }, [markers, filteredMarkers, selectedMarker]);

  const selectedMarkerData = useMemo(
    () => markers.find((m) => m.id === selectedMarker) ?? null,
    [markers, selectedMarker]
  );

  const currentStopIndex = useMemo(() => {
    if (!selectedMarkerData) return 0;
    return currentDayMarkers.findIndex((m) => m.id === selectedMarkerData.id);
  }, [currentDayMarkers, selectedMarkerData]);

  const destination = useMemo(
    () => itinerary[0]?.theme || selectedPackage?.destination || "",
    [itinerary, selectedPackage]
  );

  // Navigate to prev/next stop
  const goToPrev = useCallback(() => {
    if (currentStopIndex <= 0) return;
    const prev = currentDayMarkers[currentStopIndex - 1];
    setSelectedMarker(prev.id);
    setActiveMarker(prev.id);
    mapRef.current?.flyTo({ center: prev.coordinates, zoom: 16, pitch: 50, duration: 800 });
  }, [currentStopIndex, currentDayMarkers, setActiveMarker]);

  const goToNext = useCallback(() => {
    if (currentStopIndex >= currentDayMarkers.length - 1) return;
    const next = currentDayMarkers[currentStopIndex + 1];
    setSelectedMarker(next.id);
    setActiveMarker(next.id);
    mapRef.current?.flyTo({ center: next.coordinates, zoom: 16, pitch: 50, duration: 800 });
  }, [currentStopIndex, currentDayMarkers, setActiveMarker]);

  // ── Build marker DOM ─────────────────────────────────────────────────
  const buildMarkerElement = useCallback((
    label: string,
    coordinates: [number, number],
    color: string,
    index: number,
    size: number,
    isSelected: boolean,
    destinationHint?: string,
  ) => {
    const el = document.createElement("div");
    el.style.cssText = `cursor:pointer;position:relative;width:${size}px;height:${size + 22}px;`;

    const inner = document.createElement("div");
    inner.style.cssText = `
      width:${size}px;height:${size}px;
      background:${color};
      border:${isSelected ? "3px" : "2.5px"} solid ${isSelected ? "#fff" : "rgba(255,255,255,0.92)"};
      border-radius:${size <= 42 ? "50%" : "14px"};
      overflow:hidden;
      display:flex;align-items:center;justify-content:center;
      box-shadow:${isSelected
        ? `0 0 0 4px ${color}55, 0 8px 24px rgba(0,0,0,0.45)`
        : `0 4px 14px rgba(0,0,0,0.35), 0 0 0 2px ${color}30`};
      cursor:pointer;
      transition:transform 0.2s ease, box-shadow 0.2s ease, border-radius 0.2s ease;
      position:relative;
    `;

    const photoCacheKey = `${label}|${coordinates.join(",")}`;
    const cachedPhotoUrl = markerPhotoCacheRef.current.get(photoCacheKey);
    const currentGen = markerGenRef.current;

    const applyPhoto = (url: string) => {
      inner.innerHTML = "";
      const img = document.createElement("img");
      img.src = url;
      img.alt = label;
      img.style.cssText = "width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;";
      img.onerror = () => {
        img.remove();
        inner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
      };
      inner.appendChild(img);
    };

    if (cachedPhotoUrl) {
      applyPhoto(cachedPhotoUrl);
    } else {
      inner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
      fetchPlaceDetails(label, coordinates, destinationHint).then((details) => {
        if (currentGen !== markerGenRef.current) return;
        if (details?.photos?.[0]) {
          markerPhotoCacheRef.current.set(photoCacheKey, details.photos[0]);
          applyPhoto(details.photos[0]);
        }
      });
    }
    el.appendChild(inner);

    // Numbered badge
    const badge = document.createElement("div");
    badge.style.cssText = `
      position:absolute;top:-5px;left:-5px;z-index:2;
      width:20px;height:20px;
      background:${color};border:2.5px solid white;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:9px;font-weight:800;color:white;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    `;
    badge.textContent = String(index + 1);
    el.appendChild(badge);

    // Label below
    const labelEl = document.createElement("div");
    labelEl.style.cssText = `
      position:absolute;top:${size + 2}px;left:50%;transform:translateX(-50%);
      white-space:nowrap;max-width:130px;
      font-size:10px;font-weight:600;color:white;
      text-shadow:0 1px 5px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.5);
      text-overflow:ellipsis;overflow:hidden;
      pointer-events:none;text-align:center;
      line-height:1.3;
    `;
    labelEl.textContent = label;
    el.appendChild(labelEl);

    // Hover effects
    el.addEventListener("mouseenter", () => {
      inner.style.transform = "scale(1.12)";
      inner.style.boxShadow = `0 0 0 4px ${color}50, 0 8px 28px rgba(0,0,0,0.5)`;
    });
    el.addEventListener("mouseleave", () => {
      inner.style.transform = "scale(1)";
      inner.style.boxShadow = isSelected
        ? `0 0 0 4px ${color}55, 0 8px 24px rgba(0,0,0,0.45)`
        : `0 4px 14px rgba(0,0,0,0.35), 0 0 0 2px ${color}30`;
    });

    return { el, inner };
  }, []);

  // ── Initialize Mapbox ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLES[mapStyle],
      center: initialCenter,
      zoom: initialZoom,
      pitch: selectedPackage ? 45 : 0,
      bearing: 0,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "bottom-right");

    map.on("click", () => {
      setSelectedMarker(null);
      setActiveMarker(null);
    });

    map.on("load", () => {
      mapRef.current = map;
      setMapReady(true);
      setMapLoaded(true);
      // Force resize after layout settles to ensure tiles fill the container
      requestAnimationFrame(() => map.resize());
      setTimeout(() => map.resize(), 200);
      setTimeout(() => map.resize(), 600);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Switch map style ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    map.setStyle(MAP_STYLES[mapStyle]);
    // Re-add route sources/layers after style load
    map.once("style.load", () => {
      // Markers will be re-rendered by the marker effect
    });
  }, [mapStyle, mapLoaded]);

  // ── Resize on layout changes ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    // Immediate + delayed resize to handle layout transitions
    map.resize();
    const t1 = window.setTimeout(() => map.resize(), 100);
    const t2 = window.setTimeout(() => map.resize(), 400);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [plannerChatOpen, mapLoaded]);

  // ── ResizeObserver for container dimension changes ──────────────────────
  useEffect(() => {
    const el = containerRef.current;
    const map = mapRef.current;
    if (!el || !map) return;
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapLoaded]);

  // ── Pan to viewport changes from store ─────────────────────────────────
  useEffect(() => {
    viewportChangeRef.current += 1;
    if (viewportChangeRef.current <= 1) return;
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [viewport.longitude, viewport.latitude],
      zoom: viewport.zoom,
      pitch: viewport.pitch ?? 0,
      bearing: viewport.bearing ?? 0,
      duration: 1200,
    });
  }, [viewport]);

  // ── Fit bounds to active day ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const day = itinerary[activeDay];
    if (!map || !mapLoaded || !day?.coordinates) return;

    const dayCoords = day.rows.filter((r) => r.coordinates).map((r) => r.coordinates as [number, number]);
    if (dayCoords.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      dayCoords.forEach((c) => bounds.extend(c));
      map.fitBounds(bounds, { padding: { top: 80, bottom: 60, left: 60, right: 60 }, duration: 1000 });
    } else {
      map.flyTo({ center: [day.coordinates[0], day.coordinates[1]], zoom: 14, pitch: 45, duration: 1000 });
    }
  }, [activeDay, itinerary, mapLoaded]);

  // ── Helper: add route line to map ──────────────────────────────────────
  const addRouteLine = useCallback((map: mapboxgl.Map, coords: [number, number][], color: string, id: string) => {
    // Remove existing
    if (map.getLayer(`${id}-line`)) map.removeLayer(`${id}-line`);
    if (map.getLayer(`${id}-border`)) map.removeLayer(`${id}-border`);
    if (map.getLayer(`${id}-dash`)) map.removeLayer(`${id}-dash`);
    if (map.getSource(id)) map.removeSource(id);

    map.addSource(id, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: coords },
      },
    });

    // Border/glow
    map.addLayer({
      id: `${id}-border`,
      type: "line",
      source: id,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": color,
        "line-width": 8,
        "line-opacity": 0.15,
        "line-blur": 4,
      },
    });

    // Main line
    map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": color,
        "line-width": 3.5,
        "line-opacity": 0.9,
      },
    });

    // Animated dashes
    map.addLayer({
      id: `${id}-dash`,
      type: "line",
      source: id,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#ffffff",
        "line-width": 1.5,
        "line-opacity": 0.6,
        "line-dasharray": [2, 4],
      },
    });
  }, []);

  // ── Render markers + routes ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Clear route layers
    ["route", "pkg-route"].forEach((id) => {
      if (map.getLayer(`${id}-line`)) map.removeLayer(`${id}-line`);
      if (map.getLayer(`${id}-border`)) map.removeLayer(`${id}-border`);
      if (map.getLayer(`${id}-dash`)) map.removeLayer(`${id}-dash`);
      if (map.getSource(id)) map.removeSource(id);
    });

    const currentGen = ++markerGenRef.current;

    // ── AI itinerary markers ─────────────────────────────────────────
    if (markers.length > 0) {
      filteredMarkers.forEach((md) => {
        const dayColor = getDayColor(md.dayIndex);
        const isSelected = md.id === selectedMarker;
        const isActive = md.id === activeMarkerId;
        const size = isSelected ? 50 : isActive ? 44 : 40;

        const { el } = buildMarkerElement(
          md.label, md.coordinates, dayColor,
          md.activityIndex, size, isSelected,
          itinerary[md.dayIndex]?.rows?.[0]?.activity,
        );

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelectedMarker(md.id);
          setActiveMarker(md.id);
          if (md.dayIndex !== activeDay) setActiveDay(md.dayIndex);
          map.flyTo({ center: md.coordinates, zoom: 17, pitch: 55, duration: 800 });
        });

        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat(md.coordinates)
          .addTo(map);
        markersRef.current.push(marker);
      });

      // Route polyline for active day
      const day = itinerary[activeDay];
      if (day) {
        const coords = day.rows
          .filter((r) => r.coordinates)
          .map((r) => r.coordinates as [number, number]);

        if (coords.length >= 2) {
          const dayColor = getDayColor(activeDay);
          addRouteLine(map, coords, dayColor, "route");

          // Upgrade to road-snapped
          fetchRouteCoords(coords).then((roadPath) => {
            if (roadPath && currentGen === markerGenRef.current && map.getSource("route")) {
              (map.getSource("route") as mapboxgl.GeoJSONSource).setData({
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: roadPath },
              });
            }
          });
        }
      }

      // Fit bounds
      if (filteredMarkers.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        filteredMarkers.forEach((m) => bounds.extend(m.coordinates));
        map.fitBounds(bounds, { padding: { top: 80, bottom: 60, left: 60, right: 60 }, duration: 1000 });
      } else if (filteredMarkers.length === 1) {
        map.flyTo({ center: filteredMarkers[0].coordinates, zoom: 15, pitch: 45, duration: 800 });
      }
    }
    // ── Fallback: package itinerary points ────────────────────────────
    else if (selectedPackage) {
      const points = selectedPackage.itineraryPoints;
      const bounds = new mapboxgl.LngLatBounds();

      points.forEach((pt, idx) => {
        const ptStyle = POINT_STYLES[pt.type] || POINT_STYLES.activity;

        const { el } = buildMarkerElement(
          pt.name, pt.coordinates, ptStyle.color, idx, 40, false,
        );

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          map.flyTo({ center: pt.coordinates, zoom: 17, pitch: 55, duration: 800 });
        });

        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat(pt.coordinates)
          .addTo(map);
        markersRef.current.push(marker);
        bounds.extend(pt.coordinates);
      });

      // Route
      const pkgCoords = points.map((p) => p.coordinates);
      if (pkgCoords.length >= 2) {
        addRouteLine(map, pkgCoords, "#F59E0B", "pkg-route");

        fetchRouteCoords(pkgCoords).then((roadPath) => {
          if (roadPath && mapRef.current?.getSource("pkg-route")) {
            (mapRef.current.getSource("pkg-route") as mapboxgl.GeoJSONSource).setData({
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: roadPath },
            });
          }
        });
      }

      if (points.length > 1) {
        map.fitBounds(bounds, { padding: 80, duration: 1000 });
      } else if (points.length === 1) {
        map.flyTo({ center: points[0].coordinates, zoom: 14, pitch: 45, duration: 800 });
      }
    }
  }, [mapLoaded, filteredMarkers, selectedMarker, activeMarkerId, itinerary, selectedPackage, setActiveMarker, setActiveDay, markers, activeDay, fetchRouteCoords, buildMarkerElement, addRouteLine]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-950">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl text-center p-8 max-w-sm mx-4 shadow-lg">
          <div className="text-4xl mb-4">🗺️</div>
          <h3 className="text-gray-200 font-semibold mb-2 text-sm">Map Not Available</h3>
          <p className="text-xs leading-relaxed text-gray-500">
            Add <code className="text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded text-[11px]">NEXT_PUBLIC_MAPBOX_TOKEN</code> to your <code>.env.local</code>
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
      <div ref={containerRef} className="absolute inset-0 z-0" style={{ width: "100%", height: "100%" }} />

      {/* Place detail card */}
      <PlaceDetailCard
        marker={selectedMarkerData}
        day={selectedMarkerData ? itinerary[selectedMarkerData.dayIndex] : undefined}
        destination={destination}
        totalStops={currentDayMarkers.length}
        currentStopIndex={currentStopIndex}
        onClose={() => {
          setSelectedMarker(null);
          setActiveMarker(null);
        }}
        onPrev={goToPrev}
        onNext={goToNext}
      />

      {/* Style toggle */}
      <button
        onClick={() => setMapStyle((s) => {
          const idx = STYLE_ORDER.indexOf(s);
          return STYLE_ORDER[(idx + 1) % STYLE_ORDER.length];
        })}
        className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-lg hover:bg-black/70 active:scale-95 transition-all duration-200"
        title={`Current: ${mapStyle}`}
      >
        <Layers size={14} className="text-white/80" />
        <span className="text-[11px] font-medium text-white/80 capitalize">{mapStyle}</span>
      </button>

      <MapScoreBadge />
    </motion.div>
  );
}
