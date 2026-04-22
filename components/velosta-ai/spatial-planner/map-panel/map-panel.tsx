"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Sun, SunMedium, Sunset, Moon, Plus, Minus, Compass } from "lucide-react";
import { useMapStore } from "@/lib/stores/map-store";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useUIStore } from "@/lib/stores/ui-store";
import MapScoreBadge from "./map-score-badge";
import PlaceDetailCard from "./place-detail-card";
import { fetchPlaceDetails } from "@/lib/services/google-places";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// ── Velosta Gilded Meridian palette — must match the itinerary panel ────────
const DAY_COLORS = [
  "#D97757", // amber
  "#2F6F73", // teal meridian
  "#B85F44", // burnt terracotta
  "#0B1F2A", // charcoal
  "#A88452", // muted gold
  "#7A4A36", // deep amber
  "#3A6A4E", // moss
  "#2A3A52", // indigo night
];

const POINT_STYLES: Record<string, { color: string; emoji: string }> = {
  stay: { color: "#2F6F73", emoji: "🏨" },
  activity: { color: "#D97757", emoji: "🎯" },
  food: { color: "#B85F44", emoji: "🍜" },
  scenic: { color: "#A88452", emoji: "📸" },
  meal: { color: "#B85F44", emoji: "🍜" },
};

function getDayColor(i: number): string {
  return DAY_COLORS[i % DAY_COLORS.length];
}

// Great-circle distance in kilometres (Haversine).
function distanceKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// A day's stops should cluster within a city/region. If the LLM (or mock data)
// returns a coordinate hundreds of km from the rest of the day, treat it as a
// bad point so it doesn't blow out fitBounds and draw a giant route line
// across the subcontinent. We pick the geographic median (component-wise),
// then drop anything farther than `thresholdKm` from it.
function filterCoordOutliers<T extends { coordinates: [number, number] }>(
  items: T[],
  thresholdKm = 250,
): { kept: T[]; dropped: T[] } {
  if (items.length < 3) return { kept: items, dropped: [] };
  const lngs = items.map((i) => i.coordinates[0]).sort((a, b) => a - b);
  const lats = items.map((i) => i.coordinates[1]).sort((a, b) => a - b);
  const mid = Math.floor(items.length / 2);
  const median: [number, number] = [
    items.length % 2 ? lngs[mid] : (lngs[mid - 1] + lngs[mid]) / 2,
    items.length % 2 ? lats[mid] : (lats[mid - 1] + lats[mid]) / 2,
  ];
  const kept: T[] = [];
  const dropped: T[] = [];
  for (const it of items) {
    if (distanceKm(it.coordinates, median) <= thresholdKm) kept.push(it);
    else dropped.push(it);
  }
  // Never drop everything — fall back to the original list if filter is too aggressive.
  if (kept.length < 2) return { kept: items, dropped: [] };
  return { kept, dropped };
}

// Map styles — Mapbox Standard v3 brings Apple-Maps-grade 3D vector
// rendering with built-in light presets, animated water, and procedural
// 3D landmarks. The classic v12 fallbacks remain for users who want a
// flatter editorial feel or true satellite imagery.
const MAP_STYLES = {
  standard: "mapbox://styles/mapbox/standard",
  satellite: "mapbox://styles/mapbox/standard-satellite",
  streets: "mapbox://styles/mapbox/streets-v12",
  dark: "mapbox://styles/mapbox/dark-v11",
};

type MapStyleKey = keyof typeof MAP_STYLES;
const STYLE_ORDER: MapStyleKey[] = ["standard", "satellite", "streets", "dark"];

const STYLE_LABELS: Record<MapStyleKey, string> = {
  standard: "Standard",
  satellite: "Satellite",
  streets: "Streets",
  dark: "Night",
};

export default function MapPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleTick, setStyleTick] = useState(0);
  const viewportChangeRef = useRef(0);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("standard");
  const [lightPreset, setLightPreset] = useState<"dawn" | "day" | "dusk" | "night">("day");
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
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
    mapRef.current?.flyTo({ center: prev.coordinates, zoom: 16.5, pitch: 62, bearing: -17, duration: 1100, essential: true });
  }, [currentStopIndex, currentDayMarkers, setActiveMarker]);

  const goToNext = useCallback(() => {
    if (currentStopIndex >= currentDayMarkers.length - 1) return;
    const next = currentDayMarkers[currentStopIndex + 1];
    setSelectedMarker(next.id);
    setActiveMarker(next.id);
    mapRef.current?.flyTo({ center: next.coordinates, zoom: 16.5, pitch: 62, bearing: -17, duration: 1100, essential: true });
  }, [currentStopIndex, currentDayMarkers, setActiveMarker]);

  // ── Build marker DOM ─────────────────────────────────────────────────
  // Velosta "Gilded Meridian" pin: engraved coin badge, gilded outer ring,
  // editorial label plate. Replaces the generic white-circle-with-photo.
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
    // IMPORTANT: the element's bottom edge IS the geographic anchor point
    // (we use anchor: "bottom" on the Marker). The pin's visual tip is the
    // small dot at `top: size + 4` with height 5px → bottom at `size + 9`.
    // Anything below that (label plate) is rendered via overflow:visible so
    // it doesn't shift the anchor. Without this, the marker visibly drifts
    // off its true coord when zoomed out / pitched.
    const anchorHeight = size + 9;
    // CRITICAL: Mapbox writes `transform: translate(Xpx, Ypx)` to this root
    // element every render frame to keep it pinned to the geographic coord.
    // We MUST NOT set a `transform` here (would be overwritten and reset to
    // the page origin briefly each frame, causing visible jitter). We only
    // declare `will-change: transform` so the browser still GPU-promotes
    // the layer for smooth panning/zooming.
    el.style.cssText = `cursor:pointer;position:relative;width:${size}px;height:${anchorHeight}px;overflow:visible;font-family:var(--font-sans, system-ui);will-change:transform;`;
    // Tag with a class so zoom listeners can scale / declutter labels.
    // (The zoom listener targets the INNER scale wrapper below — never the
    // root — so Mapbox's transform isn't disturbed.)
    el.classList.add("velosta-marker");

    // Scalable inner wrapper. All visual children are mounted inside this so
    // we can resize the marker on zoom without touching the root transform.
    const scaleWrap = document.createElement("div");
    scaleWrap.className = "velosta-marker-scale";
    scaleWrap.style.cssText = `position:absolute;inset:0;transform-origin:50% 100%;will-change:transform;`;
    el.appendChild(scaleWrap);

    // ── Inner coin (the visible pin body) ────────────────────────────
    const inner = document.createElement("div");
    inner.style.cssText = `
      width:${size}px;height:${size}px;
      background:linear-gradient(135deg, ${color} 0%, ${color}D9 100%);
      border:${isSelected ? "2.5px" : "2px"} solid #FBF8F3;
      border-radius:50%;
      overflow:hidden;
      display:flex;align-items:center;justify-content:center;
      box-shadow:${isSelected
        ? `0 0 0 3px ${color}66, 0 8px 22px rgba(11,31,42,0.35), 0 0 0 1px rgba(11,31,42,0.18)`
        : `0 4px 12px rgba(11,31,42,0.28), 0 0 0 1px rgba(11,31,42,0.12)`};
      cursor:pointer;
      transition:transform 0.2s ease, box-shadow 0.2s ease;
      position:relative;
    `;

    const photoCacheKey = `${label}|${coordinates.join(",")}`;
    const cachedPhotoUrl = markerPhotoCacheRef.current.get(photoCacheKey);
    const currentGen = markerGenRef.current;

    // Inner gilded ring + photo or fallback glyph
    const applyPhoto = (url: string) => {
      inner.innerHTML = "";
      const img = document.createElement("img");
      img.src = url;
      img.alt = label;
      img.style.cssText = "width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;filter:saturate(0.92) contrast(1.04);";
      img.onerror = () => {
        img.remove();
        inner.innerHTML = renderPinGlyph();
      };
      inner.appendChild(img);
      // Inner gilded vignette — subtle warm halo over the photo
      const vignette = document.createElement("div");
      vignette.style.cssText = `position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 35%, transparent 55%, ${color}33 100%);pointer-events:none;`;
      inner.appendChild(vignette);
    };

    const renderPinGlyph = () => `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(size * 0.42)}" height="${Math.round(size * 0.42)}" viewBox="0 0 24 24" fill="none" stroke="#FBF8F3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="2.5" fill="#FBF8F3"/></svg>`;

    if (cachedPhotoUrl) {
      applyPhoto(cachedPhotoUrl);
    } else {
      inner.innerHTML = renderPinGlyph();
      fetchPlaceDetails(label, coordinates, destinationHint).then((details) => {
        if (currentGen !== markerGenRef.current) return;
        if (details?.photos?.[0]) {
          markerPhotoCacheRef.current.set(photoCacheKey, details.photos[0]);
          applyPhoto(details.photos[0]);
        }
      });
    }
    scaleWrap.appendChild(inner);

    // ── Engraved coin badge (stop number) ───────────────────────────
    const badge = document.createElement("div");
    badge.style.cssText = `
      position:absolute;top:-4px;right:-4px;z-index:2;
      min-width:18px;height:18px;padding:0 5px;
      background:linear-gradient(135deg, #0B1F2A 0%, #1A2E3A 100%);
      border:1.5px solid #FBF8F3;border-radius:9px;
      display:flex;align-items:center;justify-content:center;
      font-size:9.5px;font-weight:700;color:${color};
      letter-spacing:0.02em;font-variant-numeric:tabular-nums;
      box-shadow:0 2px 5px rgba(11,31,42,0.35);
    `;
    badge.textContent = String(index + 1);
    scaleWrap.appendChild(badge);

    // ── Tether (the "stem" of the meridian) ────────────────────────
    const tether = document.createElement("div");
    tether.style.cssText = `
      position:absolute;top:${size - 2}px;left:50%;transform:translateX(-50%);
      width:1.5px;height:8px;
      background:linear-gradient(180deg, ${color} 0%, ${color}55 100%);
      border-radius:1px;
      pointer-events:none;
    `;
    scaleWrap.appendChild(tether);

    // Drop dot at the tip
    const dot = document.createElement("div");
    dot.style.cssText = `
      position:absolute;top:${size + 4}px;left:50%;transform:translateX(-50%);
      width:5px;height:5px;border-radius:50%;
      background:${color};
      box-shadow:0 0 0 1.5px #FBF8F3, 0 2px 4px rgba(11,31,42,0.4);
      pointer-events:none;
    `;
    scaleWrap.appendChild(dot);

    // ── Editorial label plate ───────────────────────────────────────
    const labelEl = document.createElement("div");
    // Tagged with `velosta-marker-label` so a zoom listener can hide it at
    // low zoom levels (below ~11) — without this, the label plate visually
    // "drifts" away from its geographic anchor when zoomed out, which reads
    // as the marker being in the wrong place.
    labelEl.className = "velosta-marker-label";
    labelEl.style.cssText = `
      position:absolute;top:${size + 12}px;left:50%;transform:translateX(-50%);
      white-space:nowrap;max-width:140px;
      padding:2px 7px;
      background:rgba(11,31,42,0.88);
      border:1px solid rgba(217,119,87,0.35);
      border-radius:4px;
      font-size:10px;font-weight:600;color:#FBF8F3;
      letter-spacing:0.01em;
      text-overflow:ellipsis;overflow:hidden;
      pointer-events:none;text-align:center;
      line-height:1.35;
      backdrop-filter:blur(4px);
      -webkit-backdrop-filter:blur(4px);
      box-shadow:0 2px 6px rgba(11,31,42,0.25);
    `;
    labelEl.textContent = label;
    scaleWrap.appendChild(labelEl);

    // Hover interactions
    el.addEventListener("mouseenter", () => {
      inner.style.transform = "scale(1.10)";
      inner.style.boxShadow = `0 0 0 3px ${color}55, 0 10px 26px rgba(11,31,42,0.42), 0 0 0 1px rgba(11,31,42,0.18)`;
    });
    el.addEventListener("mouseleave", () => {
      inner.style.transform = "scale(1)";
      inner.style.boxShadow = isSelected
        ? `0 0 0 3px ${color}66, 0 8px 22px rgba(11,31,42,0.35), 0 0 0 1px rgba(11,31,42,0.18)`
        : `0 4px 12px rgba(11,31,42,0.28), 0 0 0 1px rgba(11,31,42,0.12)`;
    });

    return { el, inner };
  }, []);

  // ── Apple-Maps-grade 3D treatment ─────────────────────────────────────
  // Applied after every style.load (Standard v3 supports configProperty for
  // light preset, atmosphere, 3D objects). Falls back gracefully for v12.
  const apply3DTreatment = useCallback((map: mapboxgl.Map, preset: typeof lightPreset) => {
    try {
      // Standard v3 config — controls procedural sun, building shading, etc.
      // Wrapped because v12 styles don't expose `setConfigProperty`.
      const m = map as mapboxgl.Map & {
        setConfigProperty?: (importId: string, key: string, value: unknown) => void;
      };
      if (typeof m.setConfigProperty === "function") {
        m.setConfigProperty("basemap", "lightPreset", preset);
        m.setConfigProperty("basemap", "show3dObjects", true);
        m.setConfigProperty("basemap", "showPointOfInterestLabels", true);
        m.setConfigProperty("basemap", "showTransitLabels", false);
        m.setConfigProperty("basemap", "showPlaceLabels", true);
        m.setConfigProperty("basemap", "showRoadLabels", true);
      }
    } catch {
      // ignore — non-Standard styles
    }

    // Cinematic atmospheric fog (works on both v3 and v12)
    try {
      map.setFog({
        range: [0.8, 8],
        color: preset === "night" ? "#0B1F2A" : "#FBF8F3",
        "high-color": preset === "night" ? "#1A2E3A" : "#A88452",
        "horizon-blend": 0.04,
        "space-color": preset === "night" ? "#0B1F2A" : "#D9E6E8",
        "star-intensity": preset === "night" ? 0.4 : 0,
      } as mapboxgl.Fog);
    } catch {}

    // Add a subtle 3D-buildings extrusion ONLY when not using Standard v3
    // (Standard already renders procedural buildings). Detect by checking
    // for the `composite` source which only v12-streets carries.
    try {
      const hasComposite = !!map.getSource("composite");
      const alreadyHas = !!map.getLayer("velosta-3d-buildings");
      if (hasComposite && !alreadyHas) {
        map.addLayer({
          id: "velosta-3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 14,
          paint: {
            "fill-extrusion-color": preset === "night" ? "#1A2E3A" : "#E6DFD2",
            "fill-extrusion-height": [
              "interpolate", ["linear"], ["zoom"],
              14, 0,
              15.5, ["get", "height"],
            ],
            "fill-extrusion-base": [
              "interpolate", ["linear"], ["zoom"],
              14, 0,
              15.5, ["get", "min_height"],
            ],
            "fill-extrusion-opacity": 0.85,
            "fill-extrusion-vertical-gradient": true,
          },
        });
      }
    } catch {}
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
      pitch: selectedPackage ? 60 : 35,
      bearing: selectedPackage ? -17 : 0,
      antialias: true,
      projection: { name: "globe" },
      // Smoother inertial pan/zoom feel — closer to Apple Maps
      maxPitch: 75,
      attributionControl: false,
      logoPosition: "bottom-left",
    });

    // Subtle compass (no zoom buttons — we render our own)
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: true, showZoom: false, visualizePitch: true }),
      "bottom-right",
    );
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");

    map.on("click", () => {
      setSelectedMarker(null);
      setActiveMarker(null);
    });

    const onStyleLoad = () => apply3DTreatment(map, lightPreset);

    map.on("load", () => {
      mapRef.current = map;
      setMapReady(true);
      setMapLoaded(true);
      apply3DTreatment(map, lightPreset);
      // Force resize after layout settles to ensure tiles fill the container
      requestAnimationFrame(() => map.resize());
      setTimeout(() => map.resize(), 200);
      setTimeout(() => map.resize(), 600);
    });

    map.on("style.load", onStyleLoad);

    // ── Zoom-aware marker declutter ──────────────────────────────────────
    // At low zoom (city-or-country wide), the per-marker label plate floats
    // far below its true geographic anchor and reads as the marker being
    // "in the wrong place" (e.g. labels pushed into the sea around Tokyo).
    // We hide labels and shrink pins below threshold zooms — Google-Maps
    // style — so the visible mark always sits exactly on its coord.
    const applyMarkerScale = () => {
      const z = map.getZoom();
      const showLabel = z >= 11;     // labels visible only when usefully readable
      const compact = z < 9;         // shrink pins to a dot at country view
      const scale = compact ? 0.55 : z < 11 ? 0.78 : 1;
      const root = map.getContainer();
      // Scale the INNER wrapper, never the root — Mapbox owns the root's
      // transform and overwrites it each frame to position the marker.
      root.querySelectorAll<HTMLElement>(".velosta-marker-scale").forEach((el) => {
        el.style.transform = `scale(${scale})`;
      });
      root.querySelectorAll<HTMLElement>(".velosta-marker-label").forEach((el) => {
        el.style.opacity = showLabel ? "1" : "0";
        el.style.visibility = showLabel ? "visible" : "hidden";
      });
    };
    map.on("zoom", applyMarkerScale);
    map.on("zoomend", applyMarkerScale);
    // Also run once after markers mount
    map.on("idle", applyMarkerScale);

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.off("style.load", onStyleLoad);
      map.off("zoom", applyMarkerScale);
      map.off("zoomend", applyMarkerScale);
      map.off("idle", applyMarkerScale);
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
    // 3D treatment + markers re-applied via the style.load handler above.
  }, [mapStyle, mapLoaded]);

  // ── Apply light preset live ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    apply3DTreatment(map, lightPreset);
  }, [lightPreset, mapLoaded, apply3DTreatment]);

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
  // Fires only when:
  //  • the user switches days, or
  //  • the day's stop count changes from 0 → some, or
  //  • the very first time the map loads with an itinerary.
  // We deliberately do NOT re-fit on every coordinate patch (LocationCard's
  // Google-Places snap fires N async patches per day), otherwise the camera
  // wrestles with itself and lands on the wrong neighbourhood.
  const lastFitRef = useRef<{ dayIdx: number; rowsCount: number } | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    const day = itinerary[activeDay];
    if (!map || !mapLoaded || !day?.coordinates) return;

    const dayCoordItems = day.rows
      .filter((r) => r.coordinates)
      .map((r) => ({ coordinates: r.coordinates as [number, number] }));
    const rowsCount = dayCoordItems.length;

    const last = lastFitRef.current;
    const isDayChange = !last || last.dayIdx !== activeDay;
    const becameNonEmpty = !!last && last.dayIdx === activeDay && last.rowsCount === 0 && rowsCount > 0;
    if (!isDayChange && !becameNonEmpty) return;
    lastFitRef.current = { dayIdx: activeDay, rowsCount };

    const { kept: dayCoordsKept } = filterCoordOutliers(dayCoordItems);
    const dayCoords = dayCoordsKept.map((i) => i.coordinates);

    // Compute the bounding-box diagonal so we can detect "degenerate" days
    // where every coord is essentially the same point (LLM returned the
    // city centroid for all stops). fitBounds on a tiny box + high pitch
    // produces wildly off-centre camera positions, so we fall back to flyTo.
    if (dayCoords.length > 1) {
      const lngs = dayCoords.map((c) => c[0]);
      const lats = dayCoords.map((c) => c[1]);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const diagKm = distanceKm([minLng, minLat], [maxLng, maxLat]);

      if (diagKm < 0.3) {
        // All stops within ~300 m → just fly to the centroid.
        const cLng = (minLng + maxLng) / 2;
        const cLat = (minLat + maxLat) / 2;
        map.flyTo({ center: [cLng, cLat], zoom: 16, pitch: 45, bearing: 0, duration: 1000, essential: true });
      } else {
        const bounds = new mapboxgl.LngLatBounds();
        dayCoords.forEach((c) => bounds.extend(c));
        map.fitBounds(bounds, {
          padding: { top: 80, bottom: 60, left: 60, right: 60 },
          duration: 1000,
          maxZoom: 15.5,
          // CRITICAL: reset pitch & bearing. fitBounds honours the current
          // camera otherwise, and with pitch>0 the visible centre drifts
          // significantly from the geographic centre of the bounds.
          pitch: 35,
          bearing: 0,
          essential: true,
        });
      }
    } else if (dayCoords.length === 1) {
      map.flyTo({ center: dayCoords[0], zoom: 15.5, pitch: 45, bearing: 0, duration: 1000, essential: true });
    } else {
      map.flyTo({ center: [day.coordinates[0], day.coordinates[1]], zoom: 13, pitch: 35, bearing: 0, duration: 1200, essential: true });
    }
  }, [activeDay, itinerary, mapLoaded]);

  // ── Helper: add route line to map ──────────────────────────────────────
  // Velosta gilded route: warm halo glow + crisp charcoal hairline border +
  // colored core + subtle cream dash. Reads as engraved cartography.
  const addRouteLine = useCallback((map: mapboxgl.Map, coords: [number, number][], color: string, id: string) => {
    // Remove existing
    if (map.getLayer(`${id}-line`)) map.removeLayer(`${id}-line`);
    if (map.getLayer(`${id}-border`)) map.removeLayer(`${id}-border`);
    if (map.getLayer(`${id}-glow`)) map.removeLayer(`${id}-glow`);
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

    // Outer warm halo
    map.addLayer({
      id: `${id}-glow`,
      type: "line",
      source: id,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": color,
        "line-width": 10,
        "line-opacity": 0.18,
        "line-blur": 6,
      },
    });

    // Crisp charcoal hairline (engraved feel)
    map.addLayer({
      id: `${id}-border`,
      type: "line",
      source: id,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#0B1F2A",
        "line-width": 5,
        "line-opacity": 0.55,
      },
    });

    // Colored core
    map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": color,
        "line-width": 3,
        "line-opacity": 0.95,
      },
    });

    // Cream meridian dash
    map.addLayer({
      id: `${id}-dash`,
      type: "line",
      source: id,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#FBF8F3",
        "line-width": 1.2,
        "line-opacity": 0.55,
        "line-dasharray": [1.5, 5],
      },
    });
  }, []);

  // ── Render markers + routes ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    // The style may still be (re)loading — e.g. right after setStyle on a
    // basemap switch. Adding sources/layers in that window throws
    // "Style is not done loading". Defer until style.load fires.
    if (!map.isStyleLoaded()) {
      const onReady = () => {
        map.off("idle", onReady);
        // Trigger a re-run by bumping a state via setMapLoaded ping is overkill;
        // we just re-invoke this same logic by toggling markersRef gen.
        // Simpler: schedule a microtask so React re-renders aren't needed —
        // we directly call the body again via a one-shot.
        // Instead of reinvoking, we rely on the fact that the style.load
        // listener in init also calls apply3DTreatment; a follow-up
        // dependency change (filteredMarkers identity) will trigger this
        // effect again. To be safe, force one re-run now:
        setStyleTick((t) => t + 1);
      };
      map.once("idle", onReady);
      return;
    }

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Clear route layers (must include `glow` — added by Velosta gilded route)
    ["route", "pkg-route"].forEach((id) => {
      if (map.getLayer(`${id}-dash`)) map.removeLayer(`${id}-dash`);
      if (map.getLayer(`${id}-line`)) map.removeLayer(`${id}-line`);
      if (map.getLayer(`${id}-border`)) map.removeLayer(`${id}-border`);
      if (map.getLayer(`${id}-glow`)) map.removeLayer(`${id}-glow`);
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
          map.flyTo({ center: md.coordinates, zoom: 17, pitch: 65, bearing: -17, duration: 1100, essential: true });
        });

        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat(md.coordinates)
          .addTo(map);
        markersRef.current.push(marker);
      });

      // Route polyline for active day
      const day = itinerary[activeDay];
      if (day) {
        const allDayCoordItems = day.rows
          .filter((r) => r.coordinates)
          .map((r) => ({ coordinates: r.coordinates as [number, number] }));
        // Drop geographic outliers so the route doesn't shoot across the map.
        const { kept } = filterCoordOutliers(allDayCoordItems);
        const coords = kept.map((i) => i.coordinates);

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

      // NOTE: fit-bounds for the active day is handled by a dedicated effect
      // keyed on [activeDay, itinerary, mapLoaded]. We deliberately don't
      // re-fit here, otherwise clicking a card to fly into a single stop
      // would be immediately overridden when activeMarkerId/selectedMarker
      // re-runs this effect.
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
          map.flyTo({ center: pt.coordinates, zoom: 17, pitch: 65, bearing: -17, duration: 1100, essential: true });
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
        addRouteLine(map, pkgCoords, "#D97757", "pkg-route");

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
        map.flyTo({ center: points[0].coordinates, zoom: 14.2, pitch: 58, bearing: -12, duration: 1200, essential: true });
      }
    }
  }, [mapLoaded, styleTick, filteredMarkers, selectedMarker, activeMarkerId, itinerary, selectedPackage, setActiveMarker, setActiveDay, markers, activeDay, fetchRouteCoords, buildMarkerElement, addRouteLine]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-950">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl text-center p-8 max-w-sm mx-4 shadow-lg">
          <div className="text-4xl mb-4">🗺️</div>
          <h3 className="text-gray-200 font-semibold mb-2 text-sm">Map Not Available</h3>
          <p className="text-xs leading-relaxed text-gray-500">
            Add <code className="text-[#E89378] bg-[#0B1F2A] px-1.5 py-0.5 rounded text-[11px]">NEXT_PUBLIC_MAPBOX_TOKEN</code> to your <code>.env.local</code>
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

      {/* ── Apple-Maps-grade glass control cluster (top-right) ── */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2.5">
        {/* Style picker — pill button with popover that opens LEFT */}
        <div className="relative">
          <button
            onClick={() => setStyleMenuOpen((v) => !v)}
            className="group flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/80 backdrop-blur-2xl border border-[#0B1F2A]/8 shadow-[0_8px_28px_-12px_rgba(11,31,42,0.35)] hover:bg-white/95 active:scale-[0.97] transition-all duration-200"
            title="Map style"
          >
            <Layers size={13} className="text-[#0B1F2A]/70 group-hover:text-[#D97757] transition-colors" strokeWidth={1.8} />
            <span className="text-[10.5px] font-semibold tracking-[0.08em] text-[#0B1F2A]/85">
              {STYLE_LABELS[mapStyle]}
            </span>
          </button>
          <AnimatePresence>
            {styleMenuOpen && (
              <motion.div
                initial={{ opacity: 0, x: 6, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 6, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="absolute top-0 right-[calc(100%+8px)] min-w-[136px] p-1 rounded-2xl bg-white/90 backdrop-blur-2xl border border-[#0B1F2A]/8 shadow-[0_18px_40px_-14px_rgba(11,31,42,0.35)]"
              >
                {STYLE_ORDER.map((s) => {
                  const active = s === mapStyle;
                  return (
                    <button
                      key={s}
                      onClick={() => { setMapStyle(s); setStyleMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-[11px] font-medium tracking-wide transition-colors ${
                        active
                          ? "bg-[#0B1F2A] text-[#FBF8F3]"
                          : "text-[#0B1F2A]/75 hover:bg-[#0B1F2A]/5 hover:text-[#0B1F2A]"
                      }`}
                    >
                      <span>{STYLE_LABELS[s]}</span>
                      {active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D97757]" />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Light preset dial — only meaningful on Standard v3 */}
        {mapStyle === "standard" && (
          <div className="flex items-center gap-0.5 p-1 rounded-2xl bg-white/80 backdrop-blur-2xl border border-[#0B1F2A]/8 shadow-[0_8px_28px_-12px_rgba(11,31,42,0.35)]">
            {([
              { key: "dawn",  Icon: SunMedium,  title: "Dawn"  },
              { key: "day",   Icon: Sun,        title: "Day"   },
              { key: "dusk",  Icon: Sunset,     title: "Dusk"  },
              { key: "night", Icon: Moon,       title: "Night" },
            ] as const).map(({ key, Icon, title }) => {
              const active = lightPreset === key;
              return (
                <button
                  key={key}
                  onClick={() => setLightPreset(key)}
                  title={title}
                  className={`p-1.5 rounded-xl transition-all ${
                    active
                      ? "bg-[#0B1F2A] text-[#D97757] shadow-[inset_0_0_0_1px_rgba(217,119,87,0.45)]"
                      : "text-[#0B1F2A]/55 hover:text-[#0B1F2A]/85 hover:bg-[#0B1F2A]/5"
                  }`}
                >
                  <Icon size={12} strokeWidth={1.9} />
                </button>
              );
            })}
          </div>
        )}

        {/* Zoom + reset bearing — vertical glass column */}
        <div className="flex flex-col p-1 rounded-2xl bg-white/80 backdrop-blur-2xl border border-[#0B1F2A]/8 shadow-[0_8px_28px_-12px_rgba(11,31,42,0.35)]">
          <button
            onClick={() => mapRef.current?.zoomIn({ duration: 350 })}
            className="p-1.5 rounded-xl text-[#0B1F2A]/65 hover:text-[#0B1F2A] hover:bg-[#0B1F2A]/5 transition-colors"
            title="Zoom in"
          >
            <Plus size={13} strokeWidth={2} />
          </button>
          <span aria-hidden className="mx-1 my-0.5 h-px bg-[#0B1F2A]/8" />
          <button
            onClick={() => mapRef.current?.zoomOut({ duration: 350 })}
            className="p-1.5 rounded-xl text-[#0B1F2A]/65 hover:text-[#0B1F2A] hover:bg-[#0B1F2A]/5 transition-colors"
            title="Zoom out"
          >
            <Minus size={13} strokeWidth={2} />
          </button>
          <span aria-hidden className="mx-1 my-0.5 h-px bg-[#0B1F2A]/8" />
          <button
            onClick={() => mapRef.current?.easeTo({ pitch: 35, bearing: 0, duration: 700 })}
            className="p-1.5 rounded-xl text-[#0B1F2A]/65 hover:text-[#D97757] hover:bg-[#0B1F2A]/5 transition-colors"
            title="Reset orientation"
          >
            <Compass size={13} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <MapScoreBadge />
    </motion.div>
  );
}
