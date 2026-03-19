"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Star, X, Navigation, Utensils, Camera, Tent } from "lucide-react";
import {
  useOnboardingStore,
  type DiscoveredDestination,
  type TravelPackage,
} from "@/lib/stores/onboarding-store";
import { useUser } from "@/app/utils/context";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/** Icon + color for itinerary point types */
const POINT_STYLES: Record<string, { color: string; emoji: string }> = {
  stay: { color: "#2563EB", emoji: "🏨" },
  activity: { color: "#16A34A", emoji: "🎯" },
  food: { color: "#EA580C", emoji: "🍜" },
  scenic: { color: "#8B5CF6", emoji: "📸" },
};

/** Pin color based on budget fit (for discovered destinations) */
function getPinColor(fit: string): string {
  switch (fit) {
    case "perfect": return "#16A34A";
    case "stretch": return "#F59E0B";
    case "premium": return "#EA580C";
    default: return "#D97706";
  }
}

export default function ExploreMapView() {
  const {
    selectedTier,
    selectedPackage,
    discoveredDestinations,
    userLocation,
    duration,
    selectDestination,
    setFlowStep,
    isLoadingDestinations,
    setGeneratedItinerary,
    setGeneratingItinerary,
    isGeneratingItinerary,
  } = useOnboardingStore();
  const { accessToken } = useUser();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [activePoint, setActivePoint] = useState<TravelPackage["itineraryPoints"][number] | null>(null);
  const [activePin, setActivePin] = useState<DiscoveredDestination | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Determine if we're in package mode (from packages step) or discover mode (from trip-inputs)
  const isPackageMode = !!selectedPackage;

  // Fetch road-snapped route geometry from Mapbox Directions API
  const fetchRouteGeometry = useCallback(async (coords: [number, number][]) => {
    if (coords.length < 2) return null;
    try {
      const coordStr = coords.map((c) => `${c[0]},${c[1]}`).join(";");
      const res = await fetch(`/api/directions?coords=${encodeURIComponent(coordStr)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.geometry ?? null;
    } catch {
      return null;
    }
  }, []);

  // Center of the map
  const center = useMemo((): [number, number] => {
    if (selectedPackage) return selectedPackage.coordinates;
    if (userLocation) return userLocation.coordinates;
    return [78.9629, 20.5937]; // India center
  }, [selectedPackage, userLocation]);

  // ── Initialize Mapbox map ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: center,
      zoom: selectedPackage ? 10 : 5,
      pitch: 45,
      bearing: -10,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      // Enable 3D terrain
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

      // Sky layer
      map.addLayer({
        id: "sky",
        type: "sky",
        paint: {
          "sky-type": "atmosphere",
          "sky-atmosphere-sun": [0.0, 0.0],
          "sky-atmosphere-sun-intensity": 15,
        },
      });

      // 3D buildings
      const layers = map.getStyle().layers;
      const labelLayerId = layers?.find(
        (l) => l.type === "symbol" && l.layout?.["text-field"]
      )?.id;
      map.addLayer(
        {
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 12,
          paint: {
            "fill-extrusion-color": "#f5e6d3",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.7,
          },
        },
        labelLayerId
      );

      mapRef.current = map;
      setMapLoaded(true);
      // Ensure canvas fills container after layout settles
      setTimeout(() => map.resize(), 100);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Add markers and route for selected package ───────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Clear old route layers
    if (map.getLayer("route-line")) map.removeLayer("route-line");
    if (map.getLayer("route-border")) map.removeLayer("route-border");
    if (map.getSource("route")) map.removeSource("route");

    if (isPackageMode && selectedPackage) {
      const points = selectedPackage.itineraryPoints;
      const bounds = new mapboxgl.LngLatBounds();

      // Add numbered markers for each itinerary point
      points.forEach((pt, idx) => {
        const style = POINT_STYLES[pt.type] || POINT_STYLES.activity;

        const el = document.createElement("div");
        el.className = "mapbox-itinerary-marker";
        el.style.cssText = `cursor: pointer;`;

        const inner = document.createElement("div");
        inner.style.cssText = `
          width: 36px; height: 36px;
          background: ${style.color};
          border: 3px solid white;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700; color: white;
          box-shadow: 0 3px 10px rgba(0,0,0,0.25), 0 0 0 2px ${style.color}40;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        `;
        inner.textContent = String(idx + 1);
        el.appendChild(inner);
        el.addEventListener("mouseenter", () => {
          inner.style.transform = "scale(1.2)";
          inner.style.boxShadow = `0 4px 14px rgba(0,0,0,0.3), 0 0 0 3px ${style.color}50`;
        });
        el.addEventListener("mouseleave", () => {
          inner.style.transform = "scale(1)";
          inner.style.boxShadow = `0 3px 10px rgba(0,0,0,0.25), 0 0 0 2px ${style.color}40`;
        });
        el.addEventListener("click", () => {
          setActivePoint(pt);
          map.flyTo({ center: pt.coordinates, zoom: 15, pitch: 50, duration: 1000 });
        });

        const marker = new mapboxgl.Marker({ element: el, draggable: false })
          .setLngLat(pt.coordinates)
          .addTo(map);

        markersRef.current.push(marker);
        bounds.extend(pt.coordinates);
      });

      // Draw route line connecting all points (road-snapped)
      const routeCoords = points.map((p) => p.coordinates);

      const addRouteToMap = (geometry: { type: string; coordinates: [number, number][] }) => {
        if (map.getSource("route")) {
          (map.getSource("route") as mapboxgl.GeoJSONSource).setData({
            type: "Feature",
            properties: {},
            geometry,
          });
        } else {
          map.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry,
            },
          });

          // Dark border layer underneath
          map.addLayer({
            id: "route-border",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": "#7a4d00",
              "line-width": 8,
              "line-opacity": 0.6,
            },
          });

          // Main colored route line on top
          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": "#f59e0b",
              "line-width": 5,
              "line-opacity": 0.95,
            },
          });
        }
      };

      // Straight-line fallback first
      addRouteToMap({ type: "LineString", coordinates: routeCoords });

      // Then upgrade to road-following geometry
      fetchRouteGeometry(routeCoords).then((geometry) => {
        if (geometry && mapRef.current) {
          const src = mapRef.current.getSource("route") as mapboxgl.GeoJSONSource | undefined;
          if (src) {
            src.setData({ type: "Feature", properties: {}, geometry });
          }
        }
      });

      // Fit bounds with padding
      if (points.length > 1) {
        map.fitBounds(bounds, { padding: { top: 120, bottom: 250, left: 60, right: 60 }, duration: 1500 });
      } else if (points.length === 1) {
        map.flyTo({ center: points[0].coordinates, zoom: 13, pitch: 50, duration: 1500 });
      }
    } else if (!isPackageMode && discoveredDestinations.length > 0) {
      // Discover mode — show destination pins
      const bounds = new mapboxgl.LngLatBounds();

      discoveredDestinations.forEach((dest) => {
        const color = getPinColor(dest.budgetFit);
        const el = document.createElement("div");
        el.style.cssText = `cursor: pointer;`;

        const inner = document.createElement("div");
        inner.style.cssText = `
          width: 28px; height: 28px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 3px 10px rgba(0,0,0,0.25), 0 0 0 2px ${color}40;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        `;
        el.appendChild(inner);
        el.addEventListener("mouseenter", () => { inner.style.transform = "scale(1.2)"; inner.style.boxShadow = `0 4px 14px rgba(0,0,0,0.3), 0 0 0 3px ${color}50`; });
        el.addEventListener("mouseleave", () => { inner.style.transform = "scale(1)"; inner.style.boxShadow = `0 3px 10px rgba(0,0,0,0.25), 0 0 0 2px ${color}40`; });
        el.addEventListener("click", () => {
          setActivePin(dest);
          map.flyTo({ center: [dest.coordinates[0], dest.coordinates[1]], zoom: 12, pitch: 45, duration: 1000 });
        });

        const marker = new mapboxgl.Marker({ element: el, draggable: false })
          .setLngLat(dest.coordinates)
          .addTo(map);

        markersRef.current.push(marker);
        bounds.extend(dest.coordinates);
      });

      // User location marker
      if (userLocation) {
        const userEl = document.createElement("div");
        userEl.style.cssText = `
          width: 20px; height: 20px;
          background: #2563EB;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 0 6px rgba(37,99,235,0.2), 0 2px 8px rgba(0,0,0,0.3);
        `;
        const userMarker = new mapboxgl.Marker({ element: userEl })
          .setLngLat(userLocation.coordinates)
          .addTo(map);
        markersRef.current.push(userMarker);
        bounds.extend(userLocation.coordinates);
      }

      map.fitBounds(bounds, { padding: 80, duration: 1500 });
    }
  }, [mapLoaded, selectedPackage, isPackageMode, discoveredDestinations, userLocation]);

  // ── Plan trip with AI (for discover mode) ────────────────────────────────
  async function handlePlanTrip() {
    const destName = activePin?.name ?? selectedPackage?.destination;
    if (!destName) return;

    setIsTransitioning(true);
    setGeneratingItinerary(true);

    const days = selectedPackage?.days ?? duration ?? 3;
    const budget = selectedTier?.range ?? "";

    let autoMsg = `Plan a ${days}-day trip to ${destName}`;
    if (budget) autoMsg += ` with a budget of ${budget}`;
    autoMsg += `. Generate the full itinerary now.`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/velosta-ai/ai-planner`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            userSaid: autoMsg,
            conversationHistory: [],
            currentItinerary: null,
            isModificationRequest: false,
          }),
        }
      );

      clearTimeout(timeout);
      const data = await res.json();

      if (data.itineraryTable) {
        setGeneratedItinerary(data);
      } else {
        setGeneratedItinerary(null);
      }
    } catch (err) {
      console.error("[PLAN] error:", err);
      setGeneratedItinerary(null);
    } finally {
      setGeneratingItinerary(false);
      selectDestination(destName);
    }
  }

  // ── No token fallback ────────────────────────────────────────────────────
  if (!MAPBOX_TOKEN) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#FFF9F3]">
        <div className="bg-white border border-amber-200 rounded-2xl p-8 max-w-sm mx-4 text-center shadow-lg">
          <p className="text-3xl mb-3">🗺️</p>
          <h3 className="text-gray-800 font-semibold text-sm mb-2">Map not configured</h3>
          <p className="text-gray-400 text-xs">
            Add <code className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable the map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#FFF9F3]">
      {/* Loading overlay */}
      {isTransitioning && (
        <div className="absolute inset-0 z-40 bg-[#FFF9F3]/90 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-700 text-sm font-medium">
              {isGeneratingItinerary
                ? `Creating itinerary for ${activePin?.name ?? selectedPackage?.destination ?? "your trip"}...`
                : `Opening planner...`}
            </p>
          </div>
        </div>
      )}

      {/* Mapbox Map */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" style={{ width: '100%', height: '100%' }} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <div className="flex items-center gap-3 px-4 md:px-6 py-4">
          <button
            onClick={() => setFlowStep(isPackageMode ? "packages" : "trip-inputs")}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 shadow-sm active:scale-95 transition-all"
            aria-label="Back"
          >
            <ArrowLeft size={15} />
          </button>

          {isPackageMode && selectedPackage ? (
            <div className="bg-white/90 backdrop-blur-md border border-amber-200 rounded-full px-4 py-2 shadow-sm">
              <p className="text-gray-800 font-semibold text-xs">
                {selectedPackage.image} {selectedPackage.name}
                <span className="text-amber-600 ml-2">{selectedPackage.costLabel}</span>
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white/90 backdrop-blur-md border border-amber-200 rounded-full px-4 py-2 shadow-sm">
                <p className="text-gray-800 font-semibold text-xs">
                  {selectedTier?.emoji} {selectedTier?.label}
                  <span className="text-amber-600 ml-2">{selectedTier?.range}</span>
                </p>
              </div>
              {userLocation && (
                <div className="bg-white/90 backdrop-blur-md border border-blue-200 rounded-full px-3 py-2 shadow-sm">
                  <p className="text-blue-700 text-[11px] flex items-center gap-1">
                    <Navigation size={10} />
                    {userLocation.name}
                  </p>
                </div>
              )}
              <div className="ml-auto bg-white/90 backdrop-blur-md border border-gray-200 rounded-full px-3 py-2 shadow-sm">
                <p className="text-gray-500 text-[11px]">
                  <span className="font-semibold text-gray-700">{discoveredDestinations.length}</span> destinations
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Itinerary stops legend (package mode) */}
      {isPackageMode && selectedPackage && (
        <div className="absolute top-20 left-4 md:left-6 z-20">
          <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm space-y-1.5">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Stop Types</p>
            {Object.entries(POINT_STYLES).map(([type, { color, emoji }]) => (
              <div key={type} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-white" style={{ background: color, boxShadow: `0 0 4px ${color}40` }} />
                <span className="text-[10px] text-gray-500 capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discover mode legend */}
      {!isPackageMode && discoveredDestinations.length > 0 && (
        <div className="absolute top-20 left-4 md:left-6 z-20">
          <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm space-y-1.5">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Budget Fit</p>
            {[
              { color: "#16A34A", label: "Perfect fit" },
              { color: "#F59E0B", label: "Slight stretch" },
              { color: "#EA580C", label: "Premium" },
            ].map(({ color, label }) => (
              <div key={color} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-white" style={{ background: color, boxShadow: `0 0 4px ${color}40` }} />
                <span className="text-[10px] text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Package mode — itinerary point detail + Plan CTA */}
      <AnimatePresence>
        {isPackageMode && selectedPackage && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-6 md:pb-8"
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="max-w-lg mx-auto bg-white border border-amber-100 rounded-2xl shadow-xl overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500">
                <h3 className="text-white font-bold text-lg leading-tight">
                  {selectedPackage.destination}
                </h3>
                <p className="text-white/80 text-xs mt-0.5">
                  {selectedPackage.days} days · {selectedPackage.itineraryPoints.length} stops · {selectedPackage.costLabel}
                </p>
              </div>

              {/* Stops list */}
              <div className="px-5 py-4 max-h-40 overflow-y-auto space-y-2">
                {selectedPackage.itineraryPoints.map((pt, idx) => {
                  const style = POINT_STYLES[pt.type] || POINT_STYLES.activity;
                  const isActive = activePoint?.name === pt.name;
                  return (
                    <button
                      key={pt.name}
                      onClick={() => {
                        setActivePoint(pt);
                        mapRef.current?.flyTo({ center: pt.coordinates, zoom: 15, pitch: 50, duration: 800 });
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                        isActive ? "bg-amber-50 border border-amber-200" : "hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ background: style.color }}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 font-medium text-sm truncate">{pt.name}</p>
                        <p className="text-gray-400 text-[10px] capitalize">{pt.type}</p>
                      </div>
                      <span className="text-sm">{style.emoji}</span>
                    </button>
                  );
                })}
              </div>

              {/* CTA */}
              <div className="px-5 pb-5 pt-2">
                <motion.button
                  onClick={handlePlanTrip}
                  disabled={isTransitioning}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-70"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
                  }}
                  whileHover={{ boxShadow: "0 6px 24px rgba(245,158,11,0.4)" }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <MapPin size={15} />
                    Plan this trip with AI
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discover mode — destination detail card */}
      <AnimatePresence>
        {!isPackageMode && activePin && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-6 md:pb-8"
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="max-w-lg mx-auto bg-white border border-amber-100 rounded-2xl shadow-xl overflow-hidden">
              <div
                className="relative px-5 py-4"
                style={{ background: `linear-gradient(135deg, ${getPinColor(activePin.budgetFit)}, ${getPinColor(activePin.budgetFit)}cc)` }}
              >
                <button
                  onClick={() => {
                    setActivePin(null);
                    mapRef.current?.flyTo({ center: center, zoom: 5, duration: 800 });
                  }}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  aria-label="Close"
                >
                  <X size={13} />
                </button>
                <h3 className="text-white font-bold text-lg leading-tight">{activePin.name}</h3>
                <p className="text-white/70 text-xs mt-0.5">{activePin.state}</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-amber-50 rounded-xl px-3 py-2.5 text-center border border-amber-100">
                    <p className="text-amber-700 font-bold text-sm">{activePin.estimatedCost}</p>
                    <p className="text-gray-400 text-[10px] mt-0.5">est. cost</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl px-3 py-2.5 text-center border border-orange-100">
                    <p className="text-orange-700 font-bold text-sm flex items-center justify-center gap-1">
                      <Clock size={11} />{activePin.recommendedDays}d
                    </p>
                    <p className="text-gray-400 text-[10px] mt-0.5">ideal</p>
                  </div>
                  <div className="bg-green-50 rounded-xl px-3 py-2.5 text-center border border-green-100">
                    <p className="text-green-700 font-bold text-sm flex items-center justify-center gap-1">
                      <Star size={11} />{activePin.season}
                    </p>
                    <p className="text-gray-400 text-[10px] mt-0.5">best season</p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{activePin.tagline}</p>
                <div className="flex flex-wrap gap-2">
                  {activePin.highlights.map((h: string) => (
                    <span key={h} className="bg-gray-50 border border-gray-100 text-gray-600 text-[11px] px-2.5 py-1 rounded-full">{h}</span>
                  ))}
                </div>
                <motion.button
                  onClick={handlePlanTrip}
                  disabled={isTransitioning}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-70"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 4px 16px rgba(245,158,11,0.3)" }}
                  whileHover={{ boxShadow: "0 6px 24px rgba(245,158,11,0.4)" }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <MapPin size={15} />Plan this trip with AI
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint */}
      <AnimatePresence>
        {!isPackageMode && !activePin && discoveredDestinations.length > 0 && (
          <motion.div
            className="absolute bottom-6 left-0 right-0 z-20 flex justify-center pointer-events-none"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            <div className="bg-white/90 backdrop-blur-md border border-amber-100 rounded-full px-4 py-2 shadow-sm">
              <p className="text-gray-500 text-xs">Click a pin to explore</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state (discover mode only) */}
      {!isPackageMode && discoveredDestinations.length === 0 && !isLoadingDestinations && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#FFF9F3]/80 z-20">
          <div className="bg-white border border-amber-200 rounded-2xl p-8 max-w-sm mx-4 text-center shadow-lg">
            <p className="text-3xl mb-3">🗺️</p>
            <h3 className="text-gray-800 font-semibold text-sm mb-2">No destinations found</h3>
            <p className="text-gray-400 text-xs mb-4">Try adjusting your budget or duration.</p>
            <button
              onClick={() => setFlowStep("trip-inputs")}
              className="text-xs px-5 py-2.5 rounded-full font-medium bg-amber-500 text-white hover:bg-amber-600 transition-all active:scale-95"
            >
              Adjust Inputs
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

