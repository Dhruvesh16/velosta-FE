"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Calendar,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useUser } from "@/app/utils/context";
import { fetchDiscoveredDestinations } from "@/lib/services/destination-service";
import { geocodeDestination } from "@/lib/services/geocoding";
import CloudOverlay from "./cloud-overlay";

const DURATION_OPTIONS = [
  { value: 1, label: "1 day" },
  { value: 2, label: "2 days" },
  { value: 3, label: "3 days" },
  { value: 4, label: "4 days" },
  { value: 5, label: "5 days" },
  { value: 6, label: "6 days" },
  { value: 7, label: "7 days" },
  { value: 10, label: "10 days" },
  { value: 14, label: "14 days" },
];

export default function TripInputs() {
  const {
    selectedTier,
    duration,
    setDuration,
    setUserLocation,
    setDiscoveredDestinations,
    setLoadingDestinations,
    setFlowStep,
    isLoadingDestinations,
  } = useOnboardingStore();
  const { accessToken } = useUser();

  const [locationText, setLocationText] = useState("");
  const [detectedLocation, setDetectedLocation] = useState<{
    name: string;
    coordinates: [number, number];
  } | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect location via browser geolocation
  const handleDetectLocation = useCallback(async () => {
    console.log("handle detect location")
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsDetecting(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Reverse geocode to get city name
        try {
          const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&types=place&limit=1`
          );
          const data = await res.json();
          const cityName =
            data.features?.[0]?.place_name?.split(",")[0] || "Your Location";

          setDetectedLocation({
            name: cityName,
            coordinates: [longitude, latitude],
          });
          setLocationText(cityName);
          setIsDetecting(false);
        } catch {
          setDetectedLocation({
            name: "Your Location",
            coordinates: [longitude, latitude],
          });
          setLocationText("Your Location");
          setIsDetecting(false);
        }
      },
      (err) => {
        setIsDetecting(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location access denied. Please type your city instead.");
        } else {
          setError("Could not detect location. Please type your city.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Submit and discover destinations
  const handleExplore = useCallback(async () => {
    console.log("clicked")
    if (!selectedTier) return;

    let location = detectedLocation;

    // If user typed a city, geocode it
    if (!location && locationText.trim()) {
      const coords = await geocodeDestination(locationText.trim());
      if (coords) {
        location = { name: locationText.trim(), coordinates: coords };
      } else {
        setError("Could not find that location. Try a different city name.");
        return;
      }
    }

    if (!location) {
      setError("Please enter your current city or detect your location.");
      return;
    }

    setError(null);
    setUserLocation(location);
    setLoadingDestinations(true);

    try {
      console.log("entred try")

      const destinations = await fetchDiscoveredDestinations(
        {
          budget: { min: selectedTier.min, max: selectedTier.max, label: selectedTier.range },
          duration,
          userLocation: location,
        },
        accessToken || ""
      );
      console.log(destinations,"destinations from llm")

      setDiscoveredDestinations(destinations);
      setLoadingDestinations(false);
      setFlowStep("explore");
    } catch (err: any) {
      console.error("Destination discovery failed:", err);
      setLoadingDestinations(false);
      setError(
        err.message || "Failed to discover destinations. Please try again."
      );
    }
  }, [
    selectedTier,
    detectedLocation,
    locationText,
    duration,
    accessToken,
    setUserLocation,
    setLoadingDestinations,
    setDiscoveredDestinations,
    setFlowStep,
  ]);

  const isReady = (detectedLocation || locationText.trim()) && duration > 0;

  return (
    <>
      {/* Cloud loading overlay */}
      <CloudOverlay
        visible={isLoadingDestinations}
        mode="loading"
        message="Discovering amazing places for you..."
      />

      <div className="fixed inset-0 bg-[#FFF9F3] overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-[#FFF9F3]/90 backdrop-blur-md border-b border-amber-100/60">
          <div className="max-w-lg mx-auto px-6 py-4 flex items-center gap-3">
            <button
              onClick={() => setFlowStep("budget")}
              className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all active:scale-95"
              aria-label="Go back"
            >
              <ArrowLeft size={14} />
            </button>
            <div>
              <p className="text-gray-800 font-semibold text-sm">
                Plan your trip
              </p>
              <p className="text-gray-400 text-[11px]">
                {selectedTier?.emoji} {selectedTier?.range}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-lg mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 leading-tight">
              Where are you{" "}
              <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                starting from
              </span>
              ?
            </h2>
            <p className="text-gray-400 text-sm mt-2">
              We&apos;ll find the best destinations reachable within your budget
              and time.
            </p>
          </motion.div>

          {/* Location Input */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
              <MapPin size={12} className="inline mr-1" />
              Your Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={locationText}
                onChange={(e) => {
                  setLocationText(e.target.value);
                  setDetectedLocation(null);
                  setError(null);
                }}
                placeholder="e.g. Bangalore, Mumbai, Delhi..."
                className="flex-1 bg-white border border-amber-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              />
              <button
                onClick={handleDetectLocation}
                disabled={isDetecting}
                className="shrink-0 px-4 py-3 bg-white border border-amber-200 rounded-xl text-amber-600 hover:bg-amber-50 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium"
              >
                {isDetecting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Navigation size={14} />
                )}
                <span className="hidden sm:inline">Detect</span>
              </button>
            </div>
            {detectedLocation && (
              <motion.p
                className="text-xs text-green-600 mt-2 flex items-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Navigation size={10} />
                Detected: {detectedLocation.name}
              </motion.p>
            )}
          </motion.div>

          {/* Duration Selector */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
              <Calendar size={12} className="inline mr-1" />
              Trip Duration
            </label>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDuration(opt.value)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all active:scale-95 ${
                    duration === opt.value
                      ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200"
                      : "bg-white border-amber-200 text-gray-600 hover:border-amber-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div
              className="mb-6 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </motion.div>
          )}

          {/* CTA */}
          <motion.button
            onClick={handleExplore}
            disabled={!isReady || isLoadingDestinations}
            className="w-full py-4 rounded-xl text-white font-semibold text-base transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isReady
                ? "linear-gradient(135deg, #f59e0b, #d97706)"
                : "#d1d5db",
              boxShadow: isReady
                ? "0 8px 30px rgba(245,158,11,0.3)"
                : "none",
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            whileHover={
              isReady
                ? { scale: 1.02, boxShadow: "0 12px 40px rgba(245,158,11,0.4)" }
                : {}
            }
            whileTap={isReady ? { scale: 0.97 } : {}}
          >
            {isLoadingDestinations ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Discovering...
              </span>
            ) : (
              <span>
                Explore Destinations →
              </span>
            )}
          </motion.button>

          <motion.p
            className="text-center text-xs text-gray-400 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            AI will find the best places reachable from your city
          </motion.p>
        </div>
      </div>
    </>
  );
}

