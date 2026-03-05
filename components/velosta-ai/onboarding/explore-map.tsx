"use client";

import { useCallback, useState, useMemo } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
  Circle,
  Polyline,
} from "@react-google-maps/api";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Star, X, Navigation } from "lucide-react";
import {
  useOnboardingStore,
  type DiscoveredDestination,
} from "@/lib/stores/onboarding-store";
import { useUser } from "@/app/utils/context";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

/** Haversine distance in km */
function haversineKm(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number]
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Pin color based on budget fit */
function getPinColor(fit: string): string {
  switch (fit) {
    case "perfect":
      return "#16A34A"; // green
    case "stretch":
      return "#F59E0B"; // yellow
    case "premium":
      return "#EA580C"; // orange
    default:
      return "#D97706";
  }
}

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  {
    featureType: "transit",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry.fill",
    stylers: [{ color: "#dbeafe" }],
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry.fill",
    stylers: [{ color: "#fef9f0" }],
  },
];

const containerStyle = { width: "100%", height: "100%" };

export default function ExploreMapView() {
  const {
    selectedTier,
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

  const [activePin, setActivePin] = useState<DiscoveredDestination | null>(null);
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_KEY });

  const initialCenter = useMemo(() => {
    if (userLocation)
      return {
        lat: userLocation.coordinates[1],
        lng: userLocation.coordinates[0],
      };
    return { lat: 20.5937, lng: 78.9629 }; // India center
  }, [userLocation]);

  // Reach radius in meters
  const reachRadiusM = useMemo(() => {
    if (!userLocation || discoveredDestinations.length === 0) return 500_000;
    const distances = discoveredDestinations.map((d) =>
      haversineKm(userLocation.coordinates, d.coordinates)
    );
    return Math.max(...distances) * 1.15 * 1000; // km → m with 15% padding
  }, [userLocation, discoveredDestinations]);

  const onLoad = useCallback((m: google.maps.Map) => setMap(m), []);
  const onUnmount = useCallback(() => setMap(null), []);

  // ── Close active pin & zoom out ──────────────────────────────────────────
  function handleClosePin() {
    setActivePin(null);
    map?.panTo(initialCenter);
    map?.setZoom(5);
  }

  // ── Select destination → call API → go to planner ────────────────────────
  async function handlePlanTrip() {
    if (!activePin) return;
    const destName = activePin.name;

    setIsTransitioning(true);
    setGeneratingItinerary(true);

    const days = duration ?? 3;
    const budget = selectedTier?.range ?? "";
    const origin = userLocation?.name ?? "";

    let autoMsg = `Plan a ${days}-day trip to ${destName}`;
    if (budget) autoMsg += ` with a budget of ${budget}`;
    if (origin) autoMsg += ` from ${origin}`;
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
      console.log(data, "hola - explore-map response");

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

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 bg-[#FFF9F3] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading map...</p>
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
                ? `Creating itinerary for ${activePin?.name ?? "your trip"}...`
                : `Opening planner...`}
            </p>
          </div>
        </div>
      )}

      {/* Google Map */}
      <div className="absolute inset-0">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={initialCenter}
          zoom={5}
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
          {/* Reach circle around user */}
          {userLocation && (
            <Circle
              center={{
                lat: userLocation.coordinates[1],
                lng: userLocation.coordinates[0],
              }}
              radius={reachRadiusM}
              options={{
                fillColor: "#f59e0b",
                fillOpacity: 0.04,
                strokeColor: "#f59e0b",
                strokeOpacity: 0.2,
                strokeWeight: 2,
              }}
            />
          )}

          {/* User location marker */}
          {userLocation && (
            <Marker
              position={{
                lat: userLocation.coordinates[1],
                lng: userLocation.coordinates[0],
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#2563EB",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 3,
              }}
              title={userLocation.name}
            />
          )}

          {/* Distance lines from user to destinations */}
          {userLocation &&
            discoveredDestinations.map((dest) => (
              <Polyline
                key={`line-${dest.id}`}
                path={[
                  { lat: userLocation.coordinates[1], lng: userLocation.coordinates[0] },
                  { lat: dest.coordinates[1], lng: dest.coordinates[0] },
                ]}
                options={{
                  strokeColor:
                    hoveredPin === dest.id
                      ? "#d97706"
                      : "rgba(217, 119, 6, 0.15)",
                  strokeWeight: hoveredPin === dest.id ? 2.5 : 1.5,
                  strokeOpacity: 1,
                  geodesic: true,
                }}
              />
            ))}

          {/* Destination pins */}
          {discoveredDestinations.map((dest) => {
            const color = getPinColor(dest.budgetFit);
            return (
              <Marker
                key={dest.id}
                position={{ lat: dest.coordinates[1], lng: dest.coordinates[0] }}
                onClick={() => {
                  setActivePin(dest);
                  map?.panTo({ lat: dest.coordinates[1], lng: dest.coordinates[0] });
                  map?.setZoom(10);
                }}
                onMouseOver={() => setHoveredPin(dest.id)}
                onMouseOut={() => setHoveredPin(null)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 12,
                  fillColor: color,
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 3,
                }}
              />
            );
          })}

          {/* Hover tooltip */}
          {hoveredPin && !activePin && (() => {
            const dest = discoveredDestinations.find((d) => d.id === hoveredPin);
            if (!dest) return null;
            const distKm = userLocation
              ? Math.round(haversineKm(userLocation.coordinates, dest.coordinates))
              : null;
            return (
              <InfoWindow
                position={{ lat: dest.coordinates[1], lng: dest.coordinates[0] }}
                options={{ disableAutoPan: true, pixelOffset: new google.maps.Size(0, -16) }}
              >
                <div style={{ fontFamily: "Inter, sans-serif", minWidth: 160, padding: 2 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1f2937", marginBottom: 4 }}>{dest.name}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>
                    {dest.state}{distKm ? ` · ${distKm} km` : ""}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: getPinColor(dest.budgetFit) }}>{dest.estimatedCost}</span>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>· {dest.recommendedDays} days</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#d97706" }}>Click to explore →</div>
                </div>
              </InfoWindow>
            );
          })()}
        </GoogleMap>
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <div className="flex items-center gap-3 px-4 md:px-6 py-4">
          <button
            onClick={() => setFlowStep("trip-inputs")}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 shadow-sm active:scale-95 transition-all"
            aria-label="Back to trip setup"
          >
            <ArrowLeft size={15} />
          </button>
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
              <span className="font-semibold text-gray-700">
                {discoveredDestinations.length}
              </span>{" "}
              destinations
            </p>
          </div>
        </div>
      </div>

      {/* Pin color legend */}
      <div className="absolute top-20 left-4 md:left-6 z-20">
        <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm space-y-1.5">
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
            Budget Fit
          </p>
          {[
            { color: "#16A34A", label: "Perfect fit" },
            { color: "#F59E0B", label: "Slight stretch" },
            { color: "#EA580C", label: "Premium" },
          ].map(({ color, label }) => (
            <div key={color} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full border-2 border-white"
                style={{ background: color, boxShadow: `0 0 4px ${color}40` }}
              />
              <span className="text-[10px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Destination detail card — bottom sheet */}
      <AnimatePresence>
        {activePin && (
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
                style={{
                  background: `linear-gradient(135deg, ${getPinColor(
                    activePin.budgetFit
                  )}, ${getPinColor(activePin.budgetFit)}cc)`,
                }}
              >
                <button
                  onClick={handleClosePin}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  aria-label="Close"
                >
                  <X size={13} />
                </button>
                <h3 className="text-white font-bold text-lg leading-tight">
                  {activePin.name}
                </h3>
                <p className="text-white/70 text-xs mt-0.5">
                  {activePin.state}
                  {userLocation &&
                    ` · ${Math.round(
                      haversineKm(userLocation.coordinates, activePin.coordinates)
                    )} km away`}
                </p>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-amber-50 rounded-xl px-3 py-2.5 text-center border border-amber-100">
                    <p className="text-amber-700 font-bold text-sm">
                      {activePin.estimatedCost}
                    </p>
                    <p className="text-gray-400 text-[10px] mt-0.5">
                      est. cost
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-xl px-3 py-2.5 text-center border border-orange-100">
                    <p className="text-orange-700 font-bold text-sm flex items-center justify-center gap-1">
                      <Clock size={11} />
                      {activePin.recommendedDays}d
                    </p>
                    <p className="text-gray-400 text-[10px] mt-0.5">ideal</p>
                  </div>
                  <div className="bg-green-50 rounded-xl px-3 py-2.5 text-center border border-green-100">
                    <p className="text-green-700 font-bold text-sm flex items-center justify-center gap-1">
                      <Star size={11} />
                      {activePin.season}
                    </p>
                    <p className="text-gray-400 text-[10px] mt-0.5">best season</p>
                  </div>
                </div>

                {/* Tagline */}
                <p className="text-gray-600 text-sm leading-relaxed">
                  {activePin.tagline}
                </p>

                {/* Highlights */}
                <div className="flex flex-wrap gap-2">
                  {activePin.highlights.map((h: string) => (
                    <span
                      key={h}
                      className="bg-gray-50 border border-gray-100 text-gray-600 text-[11px] px-2.5 py-1 rounded-full"
                    >
                      {h}
                    </span>
                  ))}
                </div>

                {/* CTA */}
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

      {/* Hint */}
      <AnimatePresence>
        {!activePin && discoveredDestinations.length > 0 && (
          <motion.div
            className="absolute bottom-6 left-0 right-0 z-20 flex justify-center pointer-events-none"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            <div className="bg-white/90 backdrop-blur-md border border-amber-100 rounded-full px-4 py-2 shadow-sm">
              <p className="text-gray-500 text-xs">
                Hover a pin to preview · Click to plan
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {discoveredDestinations.length === 0 && !isLoadingDestinations && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#FFF9F3]/80 z-20">
          <div className="bg-white border border-amber-200 rounded-2xl p-8 max-w-sm mx-4 text-center shadow-lg">
            <p className="text-3xl mb-3">🗺️</p>
            <h3 className="text-gray-800 font-semibold text-sm mb-2">
              No destinations found
            </h3>
            <p className="text-gray-400 text-xs mb-4">
              Try adjusting your budget or duration.
            </p>
            <button
              onClick={() => setFlowStep("trip-inputs")}
              className="text-xs px-5 py-2.5 rounded-full font-medium bg-amber-500 text-white hover:bg-amber-600 transition-all active:scale-95"
            >
              Adjust Inputs
            </button>
          </div>
        </div>
      )}

      {/* No key fallback */}
      {!GOOGLE_KEY && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#FFF9F3] z-50">
          <div className="bg-white border border-amber-200 rounded-2xl p-8 max-w-sm mx-4 text-center shadow-lg">
            <p className="text-3xl mb-3">🗺️</p>
            <h3 className="text-gray-800 font-semibold text-sm mb-2">
              Map not configured
            </h3>
            <p className="text-gray-400 text-xs">
              Add{" "}
              <code className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                NEXT_PUBLIC_GOOGLE_MAPS_KEY
              </code>{" "}
              to enable the map.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

