"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useMapStore } from "@/lib/stores/map-store";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import MapScoreBadge from "./map-score-badge";
import PlaceDetailCard from "./place-detail-card";
import { fetchPlaceDetails } from "@/lib/services/google-places";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

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

// Singleton loader — prevents multiple loads
let initDone = false;
let mapsReady: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (mapsReady) return mapsReady;
  if (!initDone) {
    setOptions({ key: GOOGLE_KEY, v: "weekly" });
    initDone = true;
  }
  // importLibrary("maps") bootstraps the API; "marker" loads AdvancedMarkerElement
  mapsReady = Promise.all([
    importLibrary("maps"),
    importLibrary("marker"),
  ]).then(() => {});
  return mapsReady;
}

export default function MapPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const viewportChangeRef = useRef(0);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [mapTheme, setMapTheme] = useState<"satellite" | "roadmap">("satellite");
  const markerPhotoCacheRef = useRef<Map<string, string>>(new Map());
  const markerGenRef = useRef(0);

  const { viewport, markers, activeMarkerId, setMapReady, setActiveMarker } = useMapStore();
  const { itinerary, activeDay, setActiveDay } = usePlannerStore();
  const { selectedPackage } = useOnboardingStore();

  const initialCenter = useMemo(() => {
    if (selectedPackage) return { lat: selectedPackage.coordinates[1], lng: selectedPackage.coordinates[0] };
    return { lat: viewport.latitude, lng: viewport.longitude };
  }, []);
  const initialZoom = useMemo(() => selectedPackage ? 14 : Math.max(viewport.zoom, 5), []);

  // Fetch road-snapped route from Directions API (returns array of LatLngs)
  const fetchRouteCoords = useCallback(async (coords: [number, number][]): Promise<google.maps.LatLngLiteral[] | null> => {
    if (coords.length < 2) return null;
    try {
      const coordStr = coords.map((c) => `${c[0]},${c[1]}`).join(";");
      const res = await fetch(`/api/directions?coords=${encodeURIComponent(coordStr)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.geometry?.coordinates) {
        return data.geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Show current day's markers on the map
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

  // Helper: convert [lng, lat] to Google LatLng
  const toLatLng = useCallback((coords: [number, number]) => ({ lat: coords[1], lng: coords[0] }), []);

  // Navigate to prev/next stop
  const goToPrev = useCallback(() => {
    if (currentStopIndex <= 0) return;
    const prev = currentDayMarkers[currentStopIndex - 1];
    setSelectedMarker(prev.id);
    setActiveMarker(prev.id);
    const map = mapRef.current;
    if (map) {
      map.panTo(toLatLng(prev.coordinates));
      map.setZoom(16);
      map.setTilt(55);
    }
  }, [currentStopIndex, currentDayMarkers, setActiveMarker, toLatLng]);

  const goToNext = useCallback(() => {
    if (currentStopIndex >= currentDayMarkers.length - 1) return;
    const next = currentDayMarkers[currentStopIndex + 1];
    setSelectedMarker(next.id);
    setActiveMarker(next.id);
    const map = mapRef.current;
    if (map) {
      map.panTo(toLatLng(next.coordinates));
      map.setZoom(16);
      map.setTilt(55);
    }
  }, [currentStopIndex, currentDayMarkers, setActiveMarker, toLatLng]);

  // Helper: build marker DOM element
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
    el.style.cssText = `cursor: pointer; position: relative; width: ${size}px; height: ${size + 18}px;`;

    const inner = document.createElement("div");
    inner.style.cssText = `
      width: ${size}px; height: ${size}px;
      background: ${color};
      border: ${isSelected ? "3px" : "2.5px"} solid ${isSelected ? "#ffffff" : "rgba(255,255,255,0.9)"};
      border-radius: 10px;
      overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      box-shadow: ${isSelected
        ? `0 0 0 4px ${color}60, 0 6px 20px rgba(0,0,0,0.4)`
        : `0 3px 12px rgba(0,0,0,0.35), 0 0 0 2px ${color}30`};
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      position: relative;
    `;

    const photoCacheKey = `${label}|${coordinates.join(",")}`;
    const cachedPhotoUrl = markerPhotoCacheRef.current.get(photoCacheKey);
    const currentGen = markerGenRef.current;

    const applyPhoto = (url: string) => {
      inner.innerHTML = "";
      const img = document.createElement("img");
      img.src = url;
      img.alt = label;
      img.style.cssText = `width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0;`;
      img.onerror = () => {
        img.remove();
        inner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
      };
      inner.appendChild(img);
    };

    if (cachedPhotoUrl) {
      applyPhoto(cachedPhotoUrl);
    } else {
      inner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
      fetchPlaceDetails(label, coordinates, destinationHint).then((details) => {
        if (currentGen !== markerGenRef.current) return;
        if (details?.photos?.[0]) {
          markerPhotoCacheRef.current.set(photoCacheKey, details.photos[0]);
          applyPhoto(details.photos[0]);
        }
      });
    }

    el.appendChild(inner);

    // Stop number badge
    const badge = document.createElement("div");
    badge.style.cssText = `
      position: absolute; top: -4px; left: -4px; z-index: 2;
      width: 18px; height: 18px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 800; color: white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    `;
    badge.textContent = String(index + 1);
    el.appendChild(badge);

    // Label below marker
    const labelEl = document.createElement("div");
    labelEl.style.cssText = `
      position: absolute; top: ${size}px; left: 50%; transform: translateX(-50%);
      margin-top: 3px; white-space: nowrap; max-width: 120px;
      font-size: 10px; font-weight: 600; color: white;
      text-shadow: 0 1px 4px rgba(0,0,0,0.8);
      text-overflow: ellipsis; overflow: hidden;
      pointer-events: none; text-align: center;
    `;
    labelEl.textContent = label;
    el.appendChild(labelEl);

    return { el, inner };
  }, []);

  // ── Initialize Google Map ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !GOOGLE_KEY) return;
    let cancelled = false;

    loadGoogleMaps().then(() => {
      if (cancelled || !containerRef.current) return;

      const map = new google.maps.Map(containerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        mapTypeId: mapTheme === "satellite" ? "hybrid" : "roadmap",
        tilt: 67.5,
        heading: 0,
        mapId: "velosta_3d_map",
        gestureHandling: "greedy",
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      });

      map.addListener("click", () => {
        setSelectedMarker(null);
        setActiveMarker(null);
      });

      mapRef.current = map;
      setMapReady(true);
      setMapLoaded(true);
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      infoWindowRef.current?.close();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Switch map type on theme toggle ────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setMapTypeId(mapTheme === "satellite" ? "hybrid" : "roadmap");
  }, [mapTheme]);

  // ── Pan to viewport changes from store ─────────────────────────────────
  useEffect(() => {
    viewportChangeRef.current += 1;
    if (viewportChangeRef.current <= 1) return;
    const map = mapRef.current;
    if (!map) return;
    map.panTo({ lat: viewport.latitude, lng: viewport.longitude });
    map.setZoom(viewport.zoom);
    if (viewport.pitch != null) map.setTilt(viewport.pitch);
    if (viewport.bearing != null) map.setHeading(viewport.bearing);
  }, [viewport]);

  // ── Fit bounds to active day ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const day = itinerary[activeDay];
    if (!map || !day?.coordinates) return;

    const dayCoords = day.rows.filter((r) => r.coordinates).map((r) => r.coordinates as [number, number]);
    if (dayCoords.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      dayCoords.forEach((c) => bounds.extend({ lat: c[1], lng: c[0] }));
      map.fitBounds(bounds, { top: 80, bottom: 60, left: 60, right: 60 });
    } else {
      map.panTo({ lat: day.coordinates[1], lng: day.coordinates[0] });
      map.setZoom(14);
      map.setTilt(50);
    }
  }, [activeDay, itinerary]);

  // ── Render markers + route polylines ───────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear existing markers & polylines
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    infoWindowRef.current?.close();

    const currentGen = ++markerGenRef.current;

    // ── AI itinerary markers ─────────────────────────────────────────────
    if (markers.length > 0) {
      filteredMarkers.forEach((md) => {
        const dayColor = getDayColor(md.dayIndex);
        const isSelected = md.id === selectedMarker;
        const isActive = md.id === activeMarkerId;
        const size = isSelected ? 52 : isActive ? 46 : 42;

        const { el, inner } = buildMarkerElement(
          md.label, md.coordinates, dayColor,
          md.activityIndex, size, isSelected,
          itinerary[md.dayIndex]?.rows?.[0]?.activity,
        );

        // Hover: show InfoWindow
        el.addEventListener("mouseenter", () => {
          inner.style.transform = "scale(1.15)";
          inner.style.boxShadow = `0 0 0 4px ${dayColor}50, 0 6px 24px rgba(0,0,0,0.45)`;

          infoWindowRef.current?.close();
          const time = md.time || "";
          const pricing = md.pricing || "";
          const iw = new google.maps.InfoWindow({
            content: `
              <div style="padding:8px 10px;font-family:system-ui,sans-serif;">
                <div style="font-size:12px;font-weight:700;color:#111;margin-bottom:2px;line-height:1.3;">${md.label}</div>
                <div style="display:flex;align-items:center;gap:6px;font-size:10px;color:#666;">
                  ${time ? `<span>${time}</span>` : ""}
                  ${time && pricing ? `<span style="color:#ddd;">·</span>` : ""}
                  ${pricing ? `<span style="color:#059669;font-weight:600;">${pricing}</span>` : ""}
                </div>
              </div>
            `,
            disableAutoPan: true,
          });
          iw.open({ map, anchor: gMarker });
          infoWindowRef.current = iw;
        });

        el.addEventListener("mouseleave", () => {
          inner.style.transform = "scale(1)";
          inner.style.boxShadow = isSelected
            ? `0 0 0 4px ${dayColor}60, 0 6px 20px rgba(0,0,0,0.4)`
            : `0 3px 12px rgba(0,0,0,0.35), 0 0 0 2px ${dayColor}30`;
          infoWindowRef.current?.close();
          infoWindowRef.current = null;
        });

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          infoWindowRef.current?.close();
          setSelectedMarker(md.id);
          setActiveMarker(md.id);
          if (md.dayIndex !== activeDay) setActiveDay(md.dayIndex);
          map.panTo(toLatLng(md.coordinates));
          map.setZoom(18);
          map.setTilt(60);
        });

        const gMarker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: toLatLng(md.coordinates),
          content: el,
        });

        markersRef.current.push(gMarker);
      });

      // Route polyline for the active day
      const day = itinerary[activeDay];
      if (day) {
        const coords = day.rows
          .filter((r) => r.coordinates)
          .map((r) => r.coordinates as [number, number]);

        if (coords.length >= 2) {
          const dayColor = getDayColor(activeDay);

          // Straight-line path immediately
          const straightPath = coords.map((c) => toLatLng(c));

          // Border polyline
          const border = new google.maps.Polyline({
            path: straightPath,
            strokeColor: "#1a3a5c",
            strokeWeight: 7,
            strokeOpacity: 0.8,
            map,
          });
          polylinesRef.current.push(border);

          // Main route polyline
          const route = new google.maps.Polyline({
            path: straightPath,
            strokeColor: dayColor,
            strokeWeight: 4.5,
            strokeOpacity: 0.95,
            map,
          });
          polylinesRef.current.push(route);

          // Upgrade to road-snapped geometry
          fetchRouteCoords(coords).then((roadPath) => {
            if (roadPath && currentGen === markerGenRef.current) {
              border.setPath(roadPath);
              route.setPath(roadPath);
            }
          });
        }
      }

      // Fit bounds to filtered markers
      if (filteredMarkers.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        filteredMarkers.forEach((m) => bounds.extend(toLatLng(m.coordinates)));
        map.fitBounds(bounds, { top: 80, bottom: 60, left: 60, right: 60 });
      } else if (filteredMarkers.length === 1) {
        map.panTo(toLatLng(filteredMarkers[0].coordinates));
        map.setZoom(15);
        map.setTilt(50);
      }
    }
    // ── Fallback: selected package itinerary points ──────────────────────
    else if (selectedPackage) {
      const points = selectedPackage.itineraryPoints;
      const bounds = new google.maps.LatLngBounds();

      points.forEach((pt, idx) => {
        const ptStyle = POINT_STYLES[pt.type] || POINT_STYLES.activity;

        const { el, inner } = buildMarkerElement(
          pt.name, pt.coordinates, ptStyle.color, idx, 42, false,
        );

        el.addEventListener("mouseenter", () => {
          inner.style.transform = "scale(1.15)";
          inner.style.boxShadow = `0 0 0 4px ${ptStyle.color}50, 0 6px 24px rgba(0,0,0,0.45)`;
        });
        el.addEventListener("mouseleave", () => {
          inner.style.transform = "scale(1)";
          inner.style.boxShadow = `0 3px 12px rgba(0,0,0,0.35), 0 0 0 2px ${ptStyle.color}30`;
        });
        el.addEventListener("click", () => {
          map.panTo(toLatLng(pt.coordinates));
          map.setZoom(18);
          map.setTilt(60);
        });

        const gMarker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: toLatLng(pt.coordinates),
          content: el,
        });

        markersRef.current.push(gMarker);
        bounds.extend(toLatLng(pt.coordinates));
      });

      // Route (road-snapped)
      const pkgCoords = points.map((p) => p.coordinates);
      if (pkgCoords.length >= 2) {
        const straightPath = pkgCoords.map((c) => toLatLng(c));

        const border = new google.maps.Polyline({
          path: straightPath,
          strokeColor: "#5a3800",
          strokeWeight: 7,
          strokeOpacity: 0.8,
          map,
        });
        polylinesRef.current.push(border);

        const route = new google.maps.Polyline({
          path: straightPath,
          strokeColor: "#F59E0B",
          strokeWeight: 4.5,
          strokeOpacity: 0.95,
          map,
        });
        polylinesRef.current.push(route);

        fetchRouteCoords(pkgCoords).then((roadPath) => {
          if (roadPath && mapRef.current) {
            border.setPath(roadPath);
            route.setPath(roadPath);
          }
        });
      }

      if (points.length > 1) {
        map.fitBounds(bounds, 80);
      } else if (points.length === 1) {
        map.panTo(toLatLng(points[0].coordinates));
        map.setZoom(14);
        map.setTilt(50);
      }
    }
  }, [mapLoaded, filteredMarkers, selectedMarker, activeMarkerId, itinerary, selectedPackage, setActiveMarker, setActiveDay, markers, activeDay, fetchRouteCoords, toLatLng, buildMarkerElement]);

  if (!GOOGLE_KEY) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-950">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl text-center p-8 max-w-sm mx-4 shadow-lg">
          <div className="text-4xl mb-4">🗺️</div>
          <h3 className="text-gray-200 font-semibold mb-2 text-sm">Map Not Available</h3>
          <p className="text-xs leading-relaxed text-gray-500">
            Add <code className="text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded text-[11px]">NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> to your <code>.env.local</code>
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

      {/* Theme toggle button */}
      <button
        onClick={() => setMapTheme((t) => (t === "satellite" ? "roadmap" : "satellite"))}
        className="absolute top-4 left-4 z-10 flex items-center justify-center w-9 h-9 rounded-lg bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-700 shadow-lg backdrop-blur-sm hover:scale-105 active:scale-95 transition-all duration-200"
        title={mapTheme === "satellite" ? "Switch to roadmap" : "Switch to satellite"}
      >
        {mapTheme === "satellite" ? (
          <Sun size={16} className="text-amber-500" />
        ) : (
          <Moon size={16} className="text-indigo-500" />
        )}
      </button>

      <MapScoreBadge />
    </motion.div>
  );
}
