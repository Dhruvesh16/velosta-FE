"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Loader2,
  AlertCircle,
  LocateFixed,
} from "lucide-react";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useUser } from "@/app/utils/context";
import { geocodeDestination, searchPlaces } from "@/lib/services/geocoding";
import type { PlaceSuggestion } from "@/lib/services/geocoding";
import { generatePlannerResponse } from "@/lib/services/planner-service";
import { hydrateItineraryIntoStores } from "@/lib/services/itinerary-hydrator";
import { ApiError } from "@/lib/api";
import SignInGate from "@/components/velosta-ai/sign-in-gate";
import CloudOverlay from "./cloud-overlay";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

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
    setLoadingDestinations,
    setFlowStep,
    isLoadingDestinations,
    setGeneratedItinerary,
    setGeneratingItinerary,
    selectDestination,
  } = useOnboardingStore();
  const { accessToken } = useUser();

  const [locationText, setLocationText] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    coordinates: [number, number];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showSignInGate, setShowSignInGate] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (inputWrapperRef.current && !inputWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced autocomplete search
  const handleLocationChange = useCallback((value: string) => {
    setLocationText(value);
    setSelectedPlace(null);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await searchPlaces(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);
  }, []);

  const handleSelectSuggestion = useCallback((suggestion: PlaceSuggestion) => {
    setLocationText(suggestion.name);
    setSelectedPlace({
      name: suggestion.name,
      coordinates: suggestion.coordinates,
    });
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
  }, []);

  // Use my current location — reverse-geocode via Mapbox
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    setError(null);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { longitude, latitude } = pos.coords;
        let placeName = "My Location";
        try {
          if (MAPBOX_TOKEN) {
            const res = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&limit=1`
            );
            const data = await res.json();
            const full = data.features?.[0]?.place_name as string | undefined;
            if (full) placeName = full.split(",").slice(0, 2).join(", ").trim();
          }
        } catch {
          /* keep default name */
        }
        setLocationText(placeName);
        setSelectedPlace({
          name: placeName,
          coordinates: [longitude, latitude],
        });
        setSuggestions([]);
        setShowSuggestions(false);
        setIsLocating(false);
      },
      () => {
        setError(
          "Could not access your location. Please allow location access and try again."
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Submit — generate itinerary directly for the chosen destination
  const handlePlanTrip = useCallback(async () => {
    if (!selectedTier) return;

    let destination = selectedPlace;

    // If user typed a place but didn't pick from autocomplete, geocode it
    if (!destination && locationText.trim()) {
      const coords = await geocodeDestination(locationText.trim());
      if (coords) {
        destination = { name: locationText.trim(), coordinates: coords };
      } else {
        setError("Could not find that place. Try a different name.");
        return;
      }
    }

    if (!destination) {
      setError("Please enter a destination.");
      return;
    }

    // Persist trip context so we can resume after sign-in
    setUserLocation(destination);

    // Sign-in gate — the actual generation requires auth
    if (!accessToken) {
      setShowSignInGate(true);
      return;
    }

    setError(null);
    setLoadingDestinations(true);
    setGeneratingItinerary(true);

    const days = duration ?? 3;
    const budget = selectedTier.range ?? "";

    let autoMsg = `Plan a ${days}-day trip to ${destination.name}`;
    if (budget) autoMsg += ` with a budget of ${budget}`;
    autoMsg += `. Generate the full itinerary now.`;

    let didSucceed = false;
    try {
      const response = await generatePlannerResponse({
        userSaid: autoMsg,
        conversationHistory: [],
        currentItinerary: null,
        isModificationRequest: false,
        destinationHint: destination.name,
      });

      if (!response.isTextResponse && response.itineraryTable) {
        // Hydrate planner-store + map-store directly so the planner page
        // works even when ChatPanel isn't mounted (desktop layout).
        await hydrateItineraryIntoStores(response, {
          destination: response.destination ?? destination.name,
          budget: response.totalEstimatedCost || response.totalBudget,
        });
        setGeneratedItinerary(response);
        didSucceed = true;
      } else {
        setGeneratedItinerary(null);
        setError(
          response.isTextResponse
            ? response.message
            : "Velosta AI couldn't generate an itinerary. Please try again."
        );
      }
    } catch (err) {
      console.error("[PLAN] error:", err);
      setGeneratedItinerary(null);
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not reach Velosta AI. Please try again."
      );
    } finally {
      setGeneratingItinerary(false);
      setLoadingDestinations(false);
      // Only advance to the planner step when generation succeeded
      if (didSucceed) selectDestination(destination.name);
    }
  }, [
    selectedTier,
    selectedPlace,
    locationText,
    duration,
    accessToken,
    setUserLocation,
    setLoadingDestinations,
    setGeneratedItinerary,
    setGeneratingItinerary,
    selectDestination,
  ]);

  const isReady = (selectedPlace || locationText.trim()) && duration > 0;

  return (
    <>
      {/* Sign-in gate \u2014 shown when user attempts to generate without auth */}
      <SignInGate
        open={showSignInGate}
        onClose={() => setShowSignInGate(false)}
        next="/velosta-ai"
        title="Sign in to craft your itinerary"
        message="We have your trip details ready. Sign in and Velosta AI will build your day-by-day plan."
      />

      {/* Cloud loading overlay — "crafting" tone for itinerary generation */}
      <CloudOverlay
        visible={isLoadingDestinations}
        mode="crafting"
        message="Your itinerary is being crafted"
        sublines={[
          "Tracing the best route through your destination\u2026",
          "Mapping stays, food and golden-hour stops\u2026",
          "Tuning the plan to your budget and pace\u2026",
        ]}
      />

      <div className="fixed inset-0 bg-[#FFF9F3] overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-[#FFF9F3]/90 backdrop-blur-md border-b border-[#D97757]/15">
          <div className="max-w-lg mx-auto px-6 py-4 flex items-center gap-3">
            <button
              onClick={() => setFlowStep("packages")}
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
              Where do you want to{" "}
              <span className="bg-gradient-to-r from-[#D97757] to-orange-600 bg-clip-text text-transparent">
                go
              </span>
              ?
            </h2>
            <p className="text-gray-400 text-sm mt-2">
              Tell us your destination and AI will plan the perfect itinerary.
            </p>
          </motion.div>

          {/* Destination Input */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
              <MapPin size={12} className="inline mr-1" />
              Destination
            </label>
            <div className="relative" ref={inputWrapperRef}>
              <input
                type="text"
                value={locationText}
                onChange={(e) => handleLocationChange(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="e.g. Jibhi, Manali, Goa..."
                className="w-full bg-white border border-[#0B1F2A]/12 rounded-xl pl-4 pr-32 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#D97757]/70 focus:ring-2 focus:ring-[#D97757]/20 transition-all"
              />

              {/* Use my location button */}
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={isLocating}
                aria-label="Use my current location"
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[11px] font-semibold text-[#B85F44] bg-[#F5EFE6]/70 hover:bg-[#F5EFE6] border border-[#D97757]/25 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isLocating ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <LocateFixed size={12} />
                )}
                <span>{isLocating ? "Locating" : "Use my location"}</span>
              </button>

              {/* Autocomplete suggestions dropdown */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-[#0B1F2A]/12 rounded-xl shadow-lg overflow-hidden"
                  >
                    {suggestions.map((s, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => handleSelectSuggestion(s)}
                          className="w-full text-left px-4 py-3 hover:bg-[#F5EFE6]/60 transition-colors flex items-start gap-3 border-b border-gray-50 last:border-b-0"
                        >
                          <MapPin size={14} className="text-[#D97757] mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                            <p className="text-xs text-gray-400 truncate">{s.fullName}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
            {selectedPlace && (
              <motion.p
                className="text-xs text-green-600 mt-2 flex items-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <MapPin size={10} />
                {selectedPlace.name}
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
                      ? "bg-[#D97757] border-[#D97757] text-white shadow-md shadow-[#D97757]/30"
                      : "bg-white border-[#0B1F2A]/12 text-gray-600 hover:border-[#D97757]/70"
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
            onClick={handlePlanTrip}
            disabled={!isReady || isLoadingDestinations}
            className="w-full py-4 rounded-xl text-white font-semibold text-base transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isReady
                ? "linear-gradient(135deg, #D97757, #B85F44)"
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
                Planning...
              </span>
            ) : (
              <span>
                Plan My Trip →
              </span>
            )}
          </motion.button>

          <motion.p
            className="text-center text-xs text-gray-400 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Velosta AI will create a personalized itinerary for you
          </motion.p>
        </div>
      </div>
    </>
  );
}

