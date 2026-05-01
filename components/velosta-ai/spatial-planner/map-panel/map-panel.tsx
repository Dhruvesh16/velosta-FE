"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Sun, SunMedium, Sunset, Moon, Plus, Minus, Compass, Play, Square, MapPin } from "lucide-react";
import { useUser } from "@/app/utils/context";
import { useMapStore } from "@/lib/stores/map-store";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useUIStore } from "@/lib/stores/ui-store";
import MapScoreBadge from "./map-score-badge";
import PlaceDetailCard from "./place-detail-card";
import { fetchPlaceDetails } from "@/lib/services/google-places";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// ── Device capability detection ─────────────────────────────────────────────
// The Mapbox renderer cost scales sharply with: globe projection, antialias,
// 3D building extrusions, Standard v3 procedural 3D objects, and high pitch.
// On low-end devices these compound into pan/zoom jank. We probe once at
// module load and downgrade the renderer config for weak devices so the map
// stays at 60fps everywhere.
const isLowEndDevice = (): boolean => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
  // Honour user setting first.
  if (nav.connection?.saveData) return true;
  // Coarse-pointer phones with <= 4 logical cores or <= 4GB RAM struggle
  // with globe + antialias + 3D objects.
  const lowCores = (nav.hardwareConcurrency ?? 8) <= 4;
  const lowRam = (nav.deviceMemory ?? 8) <= 4;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const slowNet = nav.connection?.effectiveType === "2g" || nav.connection?.effectiveType === "slow-2g";
  return slowNet || (coarse && (lowCores || lowRam));
};
const LOW_END = typeof window !== "undefined" ? isLowEndDevice() : false;
const PREFERS_REDUCED_MOTION =
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ── One-shot stylesheet injected at first mount ─────────────────────────────
// All marker hover / selection / zoom-bucket visuals are now driven by CSS
// classes instead of per-frame inline-style writes from JS. This collapses
// O(N) DOM mutations on every zoom event into a single class toggle on the
// map container, which is what makes panning/zooming feel smooth at scale.
let __velostaMapStylesInjected = false;
function injectMarkerStylesOnce() {
  if (__velostaMapStylesInjected || typeof document === "undefined") return;
  __velostaMapStylesInjected = true;
  const style = document.createElement("style");
  style.setAttribute("data-velosta-map", "");
  style.textContent = `
    .velosta-marker { contain: layout style; }
    .velosta-marker-inner { transition: transform 0.18s ease, box-shadow 0.18s ease; will-change: transform; }
    .velosta-marker:hover .velosta-marker-inner { transform: scale(1.10); }
    .velosta-marker--selected .velosta-marker-inner {
      transform: scale(1.12);
      box-shadow: 0 0 0 3px rgba(251,248,243,0.95), 0 8px 22px rgba(11,31,42,0.45), 0 0 0 4.5px rgba(11,31,42,0.22) !important;
    }
    .velosta-marker-scale { transition: transform 0.16s ease; }
    /* Keep marker visuals stable across all zoom levels; no pin↔dot morphing. */
    .velosta-marker-anchor-dot { display: none; }
  `;
  document.head.appendChild(style);
}

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

function isValidLngLat([lng, lat]: [number, number]): boolean {
  return Number.isFinite(lng) && Number.isFinite(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

function isTransportLabel(label: string): boolean {
  // Airport rows are real POIs and should remain marker-visible.
  if (/\bairport\b/i.test(label)) return false;
  return /\b(flight|in-?flight|train|rail|metro|bus|taxi|cab|ferry|transfer|depart|departure|arrival|arrive|travel to|travel from|return journey)\b/i.test(
    label
  );
}

function dedupeNearbyMarkers<T extends { coordinates: [number, number] }>(
  markers: T[],
  minSeparationKm = 0.08
): T[] {
  const kept: T[] = [];
  for (const marker of markers) {
    const tooClose = kept.some(
      (k) => distanceKm(k.coordinates, marker.coordinates) < minSeparationKm
    );
    if (!tooClose) kept.push(marker);
  }
  return kept;
}

function toMapMarkerType(activity: string): "activity" | "stay" | "meal" {
  const a = activity.toLowerCase();
  if (/\b(breakfast|lunch|dinner|brunch|cafe|restaurant|market)\b/.test(a)) return "meal";
  if (/\b(check[- ]?in|check[- ]?out|hotel|stay|resort|hostel)\b/.test(a)) return "stay";
  return "activity";
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
  // id → marker, used to mutate selection state without rebuilding the DOM.
  const markersByIdRef = useRef<globalThis.Map<string, mapboxgl.Marker>>(new globalThis.Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleTick, setStyleTick] = useState(0);
  const viewportChangeRef = useRef(0);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("standard");
  const [lightPreset, setLightPreset] = useState<"dawn" | "day" | "dusk" | "night">("day");
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const markerPhotoCacheRef = useRef<Map<string, string>>(new Map());
  const markerGenRef = useRef(0);
  // ── Journey Preview Tour state ──────────────────────────────────────────
  const [currentZoom, setCurrentZoom] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [previewCurrent, setPreviewCurrent] = useState<{ dayNum: number; label: string } | null>(null);
  const previewCancelRef = useRef(false);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether the user explicitly dismissed the preview via the ✕ button.
  // Prevents the overlay from reopening on every re-render while at low zoom.
  // Reset when zoom recovers above the threshold (new zoom-out session).
  const previewDismissedRef = useRef(false);

  const { viewport, markers, activeMarkerId, setMapReady, setActiveMarker } = useMapStore();
  const { itinerary, activeDay, setActiveDay } = usePlannerStore();
  const { selectedPackage, selectedDestination } = useOnboardingStore();
  const { user } = useUser() as { user: { name?: string } | null };
  const plannerChatOpen = useUIStore((s) => s.plannerChatOpen);

  // Raw planner data can include transport/meta rows with weak coordinates,
  // especially for international plans. Keep the map focused on real visitable
  // places to avoid drifty preview tours and off-screen jump lines.
  const mapSafeMarkers = useMemo(() => {
    const base = markers.filter((m) => isValidLngLat(m.coordinates) && !isTransportLabel(m.label));
    const byDay = new globalThis.Map<number, typeof base>();
    base.forEach((m) => {
      const arr = byDay.get(m.dayIndex) ?? [];
      arr.push(m);
      byDay.set(m.dayIndex, arr);
    });
    const flattened: typeof base = [];
    byDay.forEach((arr) => {
      const { kept } = filterCoordOutliers(arr, 400);
      flattened.push(...dedupeNearbyMarkers(kept));
    });
    return flattened;
  }, [markers]);

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

  // Show current day's markers — or ALL markers during the journey animation
  // so every stop is visible on the map as the tour flies through each day.
  const filteredMarkers = useMemo(() => {
    if (mapSafeMarkers.length === 0) return mapSafeMarkers;
    if (isPreviewPlaying) return mapSafeMarkers;
    const activeDayMarkers = mapSafeMarkers.filter((m) => m.dayIndex === activeDay);
    if (activeDayMarkers.length > 0) return activeDayMarkers;

    // Permanent safety-net: if filtering removed all pins for the active day
    // (common with transport-heavy or broad-country itineraries), fall back to
    // raw itinerary coordinates so the map never appears empty.
    const day = itinerary[activeDay];
    if (day?.rows?.length) {
      const fallback = day.rows
        .filter((r) => Array.isArray(r.coordinates) && isValidLngLat(r.coordinates))
        .map((r, idx) => ({
          id: r.id ?? `fallback-${activeDay}-${idx}`,
          coordinates: r.coordinates as [number, number],
          label: r.activity || "Stop",
          dayIndex: activeDay,
          activityIndex: idx,
          pricing: r.pricing,
          time: r.time,
          type: toMapMarkerType(r.activity || "Stop"),
        }));
      if (fallback.length > 0) {
        return dedupeNearbyMarkers(fallback, 0.03);
      }
    }

    // Outbound day can contain mostly transport/origin-country rows.
    // Fall back to the first day that has destination-side points so
    // the map never appears blank for international journeys.
    const fallbackDay = mapSafeMarkers[0]?.dayIndex;
    if (fallbackDay === undefined) return [];
    return mapSafeMarkers.filter((m) => m.dayIndex === fallbackDay);
  }, [mapSafeMarkers, activeDay, isPreviewPlaying, markers, itinerary]);

  // Current day's markers for navigation
  const currentDayMarkers = useMemo(() => {
    const sel = mapSafeMarkers.find((m) => m.id === selectedMarker);
    if (!sel) return filteredMarkers;
    return mapSafeMarkers.filter((m) => m.dayIndex === sel.dayIndex);
  }, [mapSafeMarkers, filteredMarkers, selectedMarker]);

  const selectedMarkerData = useMemo(
    () => mapSafeMarkers.find((m) => m.id === selectedMarker) ?? null,
    [mapSafeMarkers, selectedMarker]
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
  // Cap pitch / shorten flyTo on weak devices — high pitch is one of the most
  // expensive things you can ask the renderer to do.
  const FLY_PITCH = LOW_END ? 50 : 62;
  const FLY_DURATION = PREFERS_REDUCED_MOTION ? 0 : LOW_END ? 700 : 1100;

  // ── Journey Preview computed values ────────────────────────────────────
  // Must be > minZoom (8) so the pill can actually appear. 9.5 = full metro
  // overview zone where individual pins collapse to dots.
  const PREVIEW_ZOOM_THRESHOLD = 9.5;
  const firstName = user?.name?.split(" ")[0] ?? null;
  const tripDestination = selectedDestination || selectedPackage?.destination || "Your Journey";
  const showPreviewCard =
    !isPreviewPlaying &&
    currentZoom > 0 &&
    currentZoom < PREVIEW_ZOOM_THRESHOLD &&
    mapSafeMarkers.length > 0;

  // ── Journey Preview Tour ─────────────────────────────────────────────
  const stopPreview = useCallback(() => {
    previewCancelRef.current = true;
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    setIsPreviewPlaying(false);
    setIsFullscreenPreview(false);
    setPreviewCurrent(null);
  }, []);

  const runPreviewTour = useCallback(async () => {
    const map = mapRef.current;
    if (!map || mapSafeMarkers.length === 0) return;

    previewCancelRef.current = false;
    setIsPreviewPlaying(true);

    // Sort all markers: day first, then activity index within each day
    const sorted = [...mapSafeMarkers].sort((a, b) =>
      a.dayIndex !== b.dayIndex ? a.dayIndex - b.dayIndex : a.activityIndex - b.activityIndex
    );

    const TOUR_BEARINGS = [-18, 14, 0, -12, 22, -6, 16, -10];
    const flyMs = PREFERS_REDUCED_MOTION ? 0 : 1100;
    const pauseMs = PREFERS_REDUCED_MOTION ? 250 : 1800;

    for (let i = 0; i < sorted.length; i++) {
      if (previewCancelRef.current) break;

      const m = sorted[i];
      setPreviewCurrent({ dayNum: m.dayIndex + 1, label: m.label });
      setActiveMarker(m.id);

      map.flyTo({
        center: m.coordinates,
        zoom: 15.5,
        pitch: LOW_END ? 45 : 58,
        bearing: TOUR_BEARINGS[i % TOUR_BEARINGS.length],
        duration: flyMs,
        essential: true,
      });

      await new Promise<void>((resolve) => {
        previewTimeoutRef.current = setTimeout(resolve, flyMs + pauseMs);
      });
    }

    if (!previewCancelRef.current && mapSafeMarkers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      mapSafeMarkers.forEach((m) => bounds.extend(m.coordinates));
      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 120, left: 60, right: 60 },
        duration: PREFERS_REDUCED_MOTION ? 0 : 1500,
        maxZoom: 12,
        pitch: 35,
        bearing: 0,
        essential: true,
      });
    }

    setIsPreviewPlaying(false);
    setPreviewCurrent(null);
    setActiveMarker(null);
    previewTimeoutRef.current = null;
  }, [mapSafeMarkers, setActiveMarker]);

  const goToPrev = useCallback(() => {
    if (currentStopIndex <= 0) return;
    const prev = currentDayMarkers[currentStopIndex - 1];
    setSelectedMarker(prev.id);
    setActiveMarker(prev.id);
    mapRef.current?.flyTo({ center: prev.coordinates, zoom: 16.5, pitch: FLY_PITCH, bearing: -17, duration: FLY_DURATION, essential: true });
  }, [currentStopIndex, currentDayMarkers, setActiveMarker, FLY_PITCH, FLY_DURATION]);

  const goToNext = useCallback(() => {
    if (currentStopIndex >= currentDayMarkers.length - 1) return;
    const next = currentDayMarkers[currentStopIndex + 1];
    setSelectedMarker(next.id);
    setActiveMarker(next.id);
    mapRef.current?.flyTo({ center: next.coordinates, zoom: 16.5, pitch: FLY_PITCH, bearing: -17, duration: FLY_DURATION, essential: true });
  }, [currentStopIndex, currentDayMarkers, setActiveMarker, FLY_PITCH, FLY_DURATION]);

  // ── Build marker DOM ─────────────────────────────────────────────────
  // Velosta "Gilded Meridian" pin: engraved coin badge, gilded outer ring,
  // editorial label plate. Replaces the generic white-circle-with-photo.
  //
  // Performance contract:
  //  • All hover/selection visuals are CSS-class driven (see injected
  //    stylesheet). NO per-marker JS event listeners writing inline styles.
  //  • Marker SIZE is constant — selection emphasis is delivered via the
  //    `velosta-marker--selected` class (transform + box-shadow override),
  //    so click events do NOT trigger DOM rebuilds.
  //  • `contain: layout style` is applied via class to scope reflow.
  const buildMarkerElement = useCallback((
    label: string,
    coordinates: [number, number],
    color: string,
    index: number,
    size: number,
    _isSelected: boolean,
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
    inner.className = "velosta-marker-inner";
    // Selection highlight is applied via the `.velosta-marker--selected`
    // ancestor class so clicks don't rebuild the DOM. We bake the *base*
    // shadow here; the selected variant lives in the injected stylesheet.
    inner.style.cssText = `
      width:${size}px;height:${size}px;
      background:linear-gradient(135deg, ${color} 0%, ${color}D9 100%);
      border:2px solid #FBF8F3;
      border-radius:50%;
      overflow:hidden;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 12px rgba(11,31,42,0.28), 0 0 0 1px rgba(11,31,42,0.12);
      cursor:pointer;
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
    // NOTE: `backdrop-filter: blur()` was removed here. With N labels moving
    // every frame during a pan, the compositor cost made the map feel laggy
    // on mid-range mobile. A solid translucent fill reads identically.
    labelEl.style.cssText = `
      position:absolute;top:${size + 12}px;left:50%;transform:translateX(-50%);
      white-space:nowrap;max-width:140px;
      padding:2px 7px;
      background:rgba(11,31,42,0.92);
      border:1px solid rgba(217,119,87,0.35);
      border-radius:4px;
      font-size:10px;font-weight:600;color:#FBF8F3;
      letter-spacing:0.01em;
      text-overflow:ellipsis;overflow:hidden;
      pointer-events:none;text-align:center;
      line-height:1.35;
      box-shadow:0 2px 6px rgba(11,31,42,0.25);
    `;
    labelEl.textContent = label;
    scaleWrap.appendChild(labelEl);

    // ── Anchor dot (Google-Maps-style low-zoom representation) ──────
    // The pin/coin sits ABOVE the geographic anchor on screen (this is
    // intentional at high zoom — pin tip = location, coin floats above).
    // At low zoom each pixel covers kilometres, so that ~22 px vertical
    // offset reads as a real geographic displacement and pushes coastal
    // pins visually into the water.
    //
    // Fix: render a small dot whose CENTER sits exactly on the geographic
    // anchor, and swap to it at compact / mid zoom buckets via CSS. This
    // mirrors how Google Maps collapses pins to dots when zoomed out so
    // they always sit precisely on their coordinate.
    //
    // CRITICAL: this dot lives OUTSIDE `scaleWrap` so it isn't affected by
    // the scale transform; its position is purely relative to `el`'s bottom
    // edge (= the anchor). `transform: translate(-50%, 50%)` from
    // `bottom:0; left:50%` puts the dot's center exactly on the anchor.
    const anchorDot = document.createElement("div");
    anchorDot.className = "velosta-marker-anchor-dot";
    anchorDot.style.cssText = `
      position:absolute;bottom:0;left:50%;
      width:10px;height:10px;border-radius:50%;
      background:${color};
      border:2px solid #FBF8F3;
      box-shadow:0 1px 3px rgba(11,31,42,0.45);
      transform:translate(-50%, 50%);
      pointer-events:none;
    `;
    el.appendChild(anchorDot);

    // Hover/selection visuals are handled entirely via CSS classes
    // (see injectMarkerStylesOnce). Avoiding per-marker JS event listeners
    // here keeps the main thread free during pan/zoom and prevents style
    // recalcs when the map is moving.

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
        // Procedural 3D objects are gorgeous but heavy — skip on weak HW.
        m.setConfigProperty("basemap", "show3dObjects", !LOW_END);
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
    // for the `composite` source which only v12-streets carries. Skip
    // entirely on low-end devices — fill-extrusion is a major GPU cost.
    if (LOW_END) return;
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

    injectMarkerStylesOnce();
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLES[mapStyle],
      center: initialCenter,
      zoom: initialZoom,
      pitch: selectedPackage ? (LOW_END ? 45 : 60) : 35,
      bearing: selectedPackage ? -17 : 0,
      // antialias is GPU-expensive; only opt in on capable hardware.
      antialias: !LOW_END,
      // Keep mercator projection for stable, Google-Maps-like pin anchoring.
      // Globe projection introduces extra reprojection during camera motion
      // that can make HTML markers look like they drift while zooming/panning.
      projection: { name: "mercator" },
      // Smoother inertial pan/zoom feel — closer to Apple Maps
      maxPitch: LOW_END ? 60 : 75,
      // Cap pixel ratio on huge retina screens — full DPR on 3x phones is
      // a major fragment-shader cost for negligible visual gain at this
      // marker density.
      maxTileCacheSize: LOW_END ? 25 : 50,
      attributionControl: false,
      logoPosition: "bottom-left",
      // Lock zoom floor at metro level — below zoom 8 markers drift off-coord
      // and the map gives no useful travel-planner context.
      minZoom: 8,
      // Honour reduced-motion: disable Mapbox's own animations.
      fadeDuration: PREFERS_REDUCED_MOTION ? 0 : 300,
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

    // ── Track zoom level for preview card visibility ─────────────────────
    // Only update React state on zoomend/idle (not every frame) to avoid
    // re-renders during the zoom gesture itself.
    const onZoomSettled = () => setCurrentZoom(map.getZoom());
    map.on("zoomend", onZoomSettled);
    map.on("idle", onZoomSettled);
    // Set initial value once map is loaded
    map.on("load", () => setCurrentZoom(map.getZoom()));

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      markersByIdRef.current.clear();
      map.off("style.load", onStyleLoad);
      map.off("zoomend", onZoomSettled);
      map.off("idle", onZoomSettled);
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

  // ── Auto-open fullscreen preview on zoom-out ──────────────────────────
  // When the user zooms out below the preview threshold the fullscreen overlay
  // opens automatically so they immediately see the trip summary + Begin
  // button — no need to click a pill. Respects an explicit user dismiss.
  useEffect(() => {
    if (showPreviewCard && !isPreviewPlaying && !previewDismissedRef.current) {
      setIsFullscreenPreview(true);
    }
    if (!showPreviewCard && !isPreviewPlaying) {
      // User zoomed back into detail level — reset dismiss state so the next
      // zoom-out re-opens the overlay fresh.
      previewDismissedRef.current = false;
      setIsFullscreenPreview(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreviewCard, isPreviewPlaying]);

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
    markersByIdRef.current.clear();

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
    if (mapSafeMarkers.length > 0) {
      filteredMarkers.forEach((md) => {
        const dayColor = getDayColor(md.dayIndex);
        // Constant size — selection emphasis is delivered via CSS class
        // (`velosta-marker--selected`) so click handlers don't need to
        // rebuild the DOM.
        const size = 44;

        const { el } = buildMarkerElement(
          md.label, md.coordinates, dayColor,
          md.activityIndex, size, false,
          itinerary[md.dayIndex]?.rows?.[0]?.activity,
        );

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelectedMarker(md.id);
          setActiveMarker(md.id);
          if (md.dayIndex !== activeDay) setActiveDay(md.dayIndex);
          map.flyTo({ center: md.coordinates, zoom: 17, pitch: FLY_PITCH, bearing: -17, duration: FLY_DURATION, essential: true });
        });

        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat(md.coordinates)
          .addTo(map);
        markersRef.current.push(marker);
        markersByIdRef.current.set(md.id, marker);
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
          map.flyTo({ center: pt.coordinates, zoom: 17, pitch: FLY_PITCH, bearing: -17, duration: FLY_DURATION, essential: true });
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
        map.flyTo({ center: points[0].coordinates, zoom: 14.2, pitch: LOW_END ? 45 : 58, bearing: -12, duration: FLY_DURATION, essential: true });
      }
    }
    // NOTE: `selectedMarker` and `activeMarkerId` deliberately excluded.
    // Selection visuals are applied by a separate effect that just toggles
    // a CSS class on the affected marker — no DOM rebuild on click.
  }, [mapLoaded, styleTick, filteredMarkers, itinerary, selectedPackage, setActiveMarker, setActiveDay, mapSafeMarkers, activeDay, fetchRouteCoords, buildMarkerElement, addRouteLine, FLY_PITCH, FLY_DURATION]);

  // ── Selection visuals (no DOM rebuild) ─────────────────────────────────
  // Toggling a class on the active marker is O(1) per click and avoids
  // tearing down + recreating every marker in the day every time the user
  // taps a card or a pin.
  useEffect(() => {
    const targetId = selectedMarker ?? activeMarkerId;
    const entries = markersByIdRef.current;
    entries.forEach((marker, id) => {
      const el = marker.getElement();
      el.classList.toggle("velosta-marker--selected", id === targetId);
    });
  }, [selectedMarker, activeMarkerId, mapLoaded, styleTick, filteredMarkers]);

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

      {/* ── Preview Pill (reopen shortcut after user dismissed the overlay) ──
          Only visible when the user is at overview zoom AND has explicitly
          closed the fullscreen modal. Fixes the Framer Motion + inline
          style.transform conflict by centering via a flex wrapper instead of
          translateX(-50%) so FM's y-animation never clobbers the X offset.
      ── */}
      <AnimatePresence>
        {showPreviewCard && previewDismissedRef.current && !isPreviewPlaying && !isFullscreenPreview && (
          <motion.div
            key="preview-pill"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-6 inset-x-0 z-20 flex justify-center pointer-events-none"
          >
            <button
              onClick={() => {
                previewDismissedRef.current = false;
                setIsFullscreenPreview(true);
              }}
              className="pointer-events-auto group flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full bg-[#0B1F2A]/88 backdrop-blur-2xl border border-[#D97757]/28 shadow-[0_8px_32px_rgba(11,31,42,0.55)] hover:border-[#D97757]/55 hover:bg-[#0B1F2A]/95 active:scale-[0.97] transition-all duration-200"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D97757] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D97757]" />
              </span>
              <span className="text-[12px] font-semibold text-[#FBF8F3]/75 group-hover:text-[#FBF8F3] transition-colors tracking-[0.01em]">
                {firstName ? `${firstName}'s` : "Your"}{" "}
                <span className="text-[#FBF8F3]">{tripDestination}</span>
              </span>
              <span className="flex items-center gap-1 ml-0.5 px-2 py-0.5 rounded-full bg-[#D97757]/18 border border-[#D97757]/25 text-[#D97757] text-[10px] font-semibold tracking-[0.06em] uppercase group-hover:bg-[#D97757]/28 transition-colors">
                <Play size={7} className="fill-[#D97757]" strokeWidth={0} />
                Preview
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fullscreen Preview Modal ──────────────────────────────────────
          Fills the entire map panel. Auto-opens when the user zooms out to
          the metro overview level (zoom < 9.5). The map stays live behind
          the blurred scrim — it's visible, adding cinematic depth.
          "Begin journey" starts the animated stop-by-stop tour.
      ── */}
      <AnimatePresence>
        {isFullscreenPreview && !isPreviewPlaying && (
          <motion.div
            key="preview-fullscreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute inset-0 z-30 flex flex-col pointer-events-auto overflow-hidden"
          >
            {/* Scrim — map glows through for depth */}
            <div className="absolute inset-0 bg-[#0B1F2A]/82 backdrop-blur-[10px]" />

            {/* Ambient glow orbs */}
            <div className="absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-[#D97757]/10 blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-[24rem] h-[24rem] rounded-full bg-[#2F6F73]/10 blur-[80px] pointer-events-none" />

            {/* Top meridian accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D97757]/55 to-transparent pointer-events-none" />
            {/* Bottom meridian accent line */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D97757]/20 to-transparent pointer-events-none" />

            {/* ── Content — fills the full height ── */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
              className="relative flex flex-col h-full px-8 pt-9 pb-8"
            >
              {/* Close button — top-right */}
              <button
                onClick={() => {
                  previewDismissedRef.current = true;
                  setIsFullscreenPreview(false);
                }}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-[#FBF8F3]/8 hover:bg-[#FBF8F3]/16 border border-[#FBF8F3]/10 flex items-center justify-center text-[#FBF8F3]/40 hover:text-[#FBF8F3]/75 transition-all"
                aria-label="Close preview"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>

              {/* ── Header ── */}
              <div className="mb-6 pr-10">
                <p className="text-[9.5px] font-semibold text-[#A88452] tracking-[0.2em] uppercase mb-2.5">
                  {firstName ? `${firstName}'s itinerary` : "Your itinerary"}
                </p>
                <h2 className="text-[32px] font-bold text-[#FBF8F3] leading-[1.06] tracking-[-0.03em] mb-2">
                  {tripDestination}
                </h2>
                <div className="flex items-center gap-2.5">
                  {itinerary.length > 0 && (
                    <span className="text-[12px] text-[#FBF8F3]/45 font-medium">
                      {itinerary.length} day{itinerary.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {itinerary.length > 0 && mapSafeMarkers.length > 0 && (
                    <span className="w-1 h-1 rounded-full bg-[#FBF8F3]/18 shrink-0" />
                  )}
                  {mapSafeMarkers.length > 0 && (
                    <span className="text-[12px] text-[#FBF8F3]/45 font-medium">
                      {mapSafeMarkers.length} stop{mapSafeMarkers.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Day list — scrollable, fills remaining height ── */}
              {itinerary.length > 0 && (
                <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <div className="flex flex-col gap-0">
                    {itinerary.map((day, idx) => {
                      const dayStops = mapSafeMarkers.filter((m) => m.dayIndex === idx).length;
                      const color = DAY_COLORS[idx % DAY_COLORS.length];
                      return (
                        <div
                          key={day.id}
                          className="flex items-start gap-3 py-3 border-b border-[#FBF8F3]/5 last:border-0"
                        >
                          {/* Day color dot + vertical line connector */}
                          <div className="flex flex-col items-center shrink-0 pt-0.5">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: color }}
                            />
                            {idx < itinerary.length - 1 && (
                              <div className="w-px flex-1 mt-1.5" style={{ background: `${color}22`, minHeight: "16px" }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex items-baseline gap-2">
                              <span
                                className="text-[10px] font-bold tracking-[0.1em] uppercase shrink-0"
                                style={{ color }}
                              >
                                Day {day.day}
                              </span>
                              {dayStops > 0 && (
                                <span className="text-[10px] text-[#FBF8F3]/22 font-medium shrink-0">
                                  {dayStops} stop{dayStops !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] text-[#FBF8F3]/72 font-medium leading-snug mt-0.5 truncate">
                              {day.theme}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── CTA — pinned to bottom ── */}
              <div className="shrink-0 mt-5">
                <div className="h-px bg-gradient-to-r from-transparent via-[#D97757]/20 to-transparent mb-5" />
                <button
                  onClick={() => {
                    setIsFullscreenPreview(false);
                    setTimeout(() => runPreviewTour(), 280);
                  }}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-[#D97757] hover:bg-[#C96846] active:scale-[0.98] transition-all duration-200 text-[#FBF8F3] text-[14px] font-bold tracking-[0.01em] shadow-[0_10px_30px_rgba(217,119,87,0.45)]"
                >
                  <Play size={13} className="fill-[#FBF8F3]" strokeWidth={0} />
                  Begin journey
                </button>
                <p className="text-[9.5px] text-[#FBF8F3]/20 mt-3 text-center tracking-[0.05em]">
                  Each stop plays in sequence · Press stop anytime
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Preview Tour HUD ─────────────────────────────────────────────
          Floats at the top-centre while the animated tour is running.
          Shows current day + stop name and a stop button.
      ── */}
      <AnimatePresence>
        {isPreviewPlaying && (
          <motion.div
            key="preview-hud"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-4 inset-x-0 z-20 flex justify-center pointer-events-none"
          >
            <div className="pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl bg-[#0B1F2A]/92 backdrop-blur-2xl border border-[#D97757]/22 shadow-[0_8px_28px_rgba(11,31,42,0.55)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97757] shrink-0 animate-pulse" />
              <div className="flex flex-col min-w-0">
                {previewCurrent && (
                  <>
                    <span className="text-[9px] font-semibold text-[#A88452] tracking-[0.14em] uppercase leading-none mb-0.5">
                      Day {previewCurrent.dayNum}
                    </span>
                    <span className="text-[12.5px] font-semibold text-[#FBF8F3] truncate max-w-[200px] leading-tight">
                      {previewCurrent.label}
                    </span>
                  </>
                )}
                {!previewCurrent && (
                  <span className="text-[12px] font-medium text-[#FBF8F3]/60">Finishing tour…</span>
                )}
              </div>
              <button
                onClick={stopPreview}
                className="flex items-center gap-1.5 px-2.5 py-1.5 ml-1 rounded-xl bg-[#D97757]/18 hover:bg-[#D97757]/30 border border-[#D97757]/25 text-[#D97757] text-[10.5px] font-semibold transition-all duration-180 shrink-0"
              >
                <Square size={9} className="fill-[#D97757]" strokeWidth={0} />
                Stop
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
