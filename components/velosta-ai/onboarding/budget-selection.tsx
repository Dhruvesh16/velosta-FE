"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Playfair_Display } from "next/font/google";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  MapPin,
  Loader2,
  AlertCircle,
  User,
  Heart,
  Users,
  Home,
  LocateFixed,
} from "lucide-react";
import { useOnboardingStore, type BudgetTier } from "@/lib/stores/onboarding-store";
import { geocodeDestination, searchPlaces } from "@/lib/services/geocoding";
import type { PlaceSuggestion } from "@/lib/services/geocoding";
import CloudOverlay from "./cloud-overlay";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["700", "900"] });
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const TRAVELER_TYPES = [
  { id: "solo", label: "Solo", Icon: User },
  { id: "couple", label: "Couple", Icon: Heart },
  { id: "friends", label: "Friends", Icon: Users },
  { id: "family", label: "Family", Icon: Home },
] as const;

const INTERESTS = [
  { id: "nature", label: "Nature", emoji: "🌿" },
  { id: "culture", label: "Culture", emoji: "🏛️" },
  { id: "adventure", label: "Adventure", emoji: "🏔️" },
  { id: "relaxation", label: "Relaxation", emoji: "🧘" },
  { id: "food", label: "Food", emoji: "🍜" },
  { id: "nightlife", label: "Nightlife", emoji: "🌃" },
  { id: "photography", label: "Photography", emoji: "📸" },
  { id: "shopping", label: "Shopping", emoji: "🛍️" },
  { id: "wellness", label: "Wellness & spa", emoji: "💆" },
];

const DURATION_OPTIONS = [1, 2, 3, 5, 7, 10, 14];

const MAP_SPOTS: { center: [number, number]; zoom: number }[] = [
  { center: [78.9629, 20.5937], zoom: 4.5 },
  { center: [73.6883, 24.5854], zoom: 11 },
  { center: [76.2673, 10.8505], zoom: 10 },
  { center: [77.2090, 28.6139], zoom: 11 },
];

export default function BudgetSelection() {
  const {
    setFlowStep,
    setUserLocation,
    setDuration: setStoreDuration,
    setBudgetAmount: setStoreBudget,
    setTravelerType: setStoreTravelerType,
    setTravelerCount: setStoreTravelerCount,
    setInterests: setStoreInterests,
  } = useOnboardingStore();

  // Local state
  const [budget, setBudget] = useState(5000);
  const [budgetText, setBudgetText] = useState("5,000");
  const [travelerType, setTravelerType] = useState("solo");
  const [travelerCount, setTravelerCount] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [duration, setDuration] = useState(3);
  const [locationText, setLocationText] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    coordinates: [number, number];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const destIndexRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);

  // ── Map background ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: MAP_SPOTS[0].center,
      zoom: MAP_SPOTS[0].zoom,
      pitch: 40,
      bearing: -10,
      interactive: false,
      attributionControl: false,
    });
    map.on("load", () => {
      mapRef.current = map;
      setMapReady(true);
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const interval = setInterval(() => {
      destIndexRef.current = (destIndexRef.current + 1) % MAP_SPOTS.length;
      const dest = MAP_SPOTS[destIndexRef.current];
      mapRef.current?.flyTo({
        center: dest.center,
        zoom: dest.zoom,
        pitch: 35 + Math.random() * 20,
        bearing: -20 + Math.random() * 40,
        duration: 14000,
        essential: true,
      });
    }, 16000);
    return () => clearInterval(interval);
  }, [mapReady]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        inputWrapperRef.current &&
        !inputWrapperRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Budget handlers ─────────────────────────────────────────────────
  const sliderPct = ((budget - 1000) / (50000 - 1000)) * 100;

  const handleSliderChange = (val: number) => {
    setBudget(val);
    setBudgetText(val.toLocaleString("en-IN"));
  };

  const handleBudgetTextChange = (text: string) => {
    setBudgetText(text);
    const num = parseInt(text.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(num) && num >= 500 && num <= 100000) {
      setBudget(num);
    }
  };

  const handleBudgetBlur = () => {
    setBudgetText(budget.toLocaleString("en-IN"));
  };

  // ── Interest toggle ─────────────────────────────────────────────────
  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // ── My Location ─────────────────────────────────────────────────────
  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported in this browser.");
      return;
    }
    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { longitude, latitude } = pos.coords;
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&limit=1`
          );
          const data = await res.json();
          const placeName = data.features?.[0]?.place_name ?? "My Location";
          const shortName = placeName.split(",").slice(0, 2).join(",").trim();
          setLocationText(shortName);
          setSelectedPlace({ name: shortName, coordinates: [longitude, latitude] });
        } catch {
          setLocationText("My Location");
          setSelectedPlace({ name: "My Location", coordinates: [longitude, latitude] });
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setError("Could not get your location. Please allow location access.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // ── Destination autocomplete ────────────────────────────────────────
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

  const handleSelectSuggestion = useCallback((s: PlaceSuggestion) => {
    setLocationText(s.name);
    setSelectedPlace({ name: s.name, coordinates: s.coordinates });
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────
  const handleFindDestinations = useCallback(async () => {
    let destination = selectedPlace;
    if (!destination && locationText.trim()) {
      const coords = await geocodeDestination(locationText.trim());
      if (coords) {
        destination = { name: locationText.trim(), coordinates: coords };
      }
    }

    // Save budget tier to store
    const customTier: BudgetTier = {
      id: "custom",
      label: "Custom Budget",
      range: `₹${budget.toLocaleString("en-IN")}`,
      min: Math.max(0, budget - 1000),
      max: budget,
      emoji: "🎯",
      tagline: "Your budget",
      examples: [],
      duration: `${duration} days`,
    };
    useOnboardingStore.setState({ selectedTier: customTier });

    if (destination) setUserLocation(destination);
    setStoreDuration(duration);
    setStoreBudget(budget);
    setStoreTravelerType(travelerType);
    setStoreTravelerCount(travelerCount);
    setStoreInterests(selectedInterests);
    setFlowStep("explore");
  }, [
    selectedPlace,
    locationText,
    budget,
    travelerType,
    travelerCount,
    selectedInterests,
    duration,
    setUserLocation,
    setStoreDuration,
    setStoreBudget,
    setStoreTravelerType,
    setStoreTravelerCount,
    setStoreInterests,
    setFlowStep,
  ]);

  const isReady = duration > 0 && budget >= 1000;

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <>
      <CloudOverlay
        visible={false}
        mode="loading"
        message="Finding destinations..."
      />

      <div className="fixed inset-0 overflow-hidden">
        {/* Map background */}
        <div
          ref={mapContainerRef}
          className="absolute inset-0"
          style={{ width: "100%", height: "100%", zIndex: 0 }}
        />

        {/* Frosted overlay */}
        <div
          className="absolute inset-0"
          style={{
            zIndex: 1,
            background:
              "linear-gradient(to bottom, rgba(200,190,180,0.35) 0%, rgba(200,190,180,0.2) 50%, rgba(200,190,180,0.4) 100%)",
          }}
        />

        {/* Center card */}
        <div
          className="absolute inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 10 }}
        >
          <motion.div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-white/60 px-6 py-7 md:px-8 md:py-8"
            style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(24px)" }}
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <p className="text-[10px] font-semibold tracking-[0.3em] text-[#2F6F73] uppercase mb-1">
                Velosta
              </p>
              <h2
                className={`${playfair.className} text-2xl md:text-3xl font-bold text-gray-800`}
              >
                Start Your Journey
              </h2>
              <div className="w-8 h-0.5 bg-[#D97757] mx-auto mt-2.5 rounded-full" />
            </div>

            {/* ── Budget ─────────────────────────────────── */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-600 mb-2 text-center">
                Budget per person
              </label>
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-gray-400 text-lg font-medium">₹</span>
                <input
                  type="text"
                  value={budgetText}
                  onChange={(e) => handleBudgetTextChange(e.target.value)}
                  onBlur={handleBudgetBlur}
                  className="w-36 text-center text-2xl font-bold text-gray-800 bg-[#F5EFE6]/60/60 border border-[#0B1F2A]/12 rounded-xl px-3 py-2 outline-none focus:border-[#D97757]/70 focus:ring-2 focus:ring-[#D97757]/20 transition-all"
                />
              </div>
              {/* Custom slider */}
              <div className="relative w-full h-2 rounded-full mx-auto">
                <div className="absolute inset-0 bg-[#F5EFE6] rounded-full" />
                <div
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#E89378] to-[#D97757] rounded-full transition-[width] duration-75"
                  style={{ width: `${sliderPct}%` }}
                />
                <input
                  type="range"
                  min={1000}
                  max={50000}
                  step={500}
                  value={budget}
                  onChange={(e) => handleSliderChange(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-[#D97757] rounded-full shadow-md border-2 border-white pointer-events-none transition-[left] duration-75"
                  style={{ left: `calc(${sliderPct}% - 10px)` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
                <span>₹1,000</span>
                <span>₹50,000</span>
              </div>
            </div>

            {/* ── Who is traveling? ──────────────────────── */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-600 mb-2.5 text-center">
                Who is traveling?
              </label>
              <div className="flex justify-center gap-3">
                {TRAVELER_TYPES.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setTravelerType(id);
                      if (id === "solo") setTravelerCount(1);
                      else if (id === "couple") setTravelerCount(2);
                    }}
                    className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 transition-all ${
                      travelerType === id
                        ? "border-[#D97757] bg-[#F5EFE6]/60 text-[#2F6F73]"
                        : "border-gray-200 bg-white text-gray-500 hover:border-[#D97757]/40"
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── How many people? ──────────────────────── */}
            <AnimatePresence>
              {(travelerType === "friends" || travelerType === "family") && (
                <motion.div
                  className="mb-5 text-center"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    How many people traveling?
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={travelerCount}
                    onChange={(e) =>
                      setTravelerCount(Math.max(2, parseInt(e.target.value) || 2))
                    }
                    className="w-20 text-center text-lg font-bold text-gray-800 border border-[#0B1F2A]/12 rounded-xl px-3 py-2 outline-none focus:border-[#D97757]/70 focus:ring-2 focus:ring-[#D97757]/20"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── What excites you? ─────────────────────── */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-600 mb-2.5 text-center">
                What excites you?{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap justify-center gap-2">
                {INTERESTS.map(({ id, label, emoji }) => (
                  <button
                    key={id}
                    onClick={() => toggleInterest(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedInterests.includes(id)
                        ? "border-[#D97757] bg-[#F5EFE6]/60 text-[#0B1F2A]"
                        : "border-gray-200 bg-white text-gray-600 hover:border-[#D97757]/40"
                    }`}
                  >
                    <span>{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Destination ───────────────────────────── */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-600 mb-2 text-center">
                <MapPin size={12} className="inline mr-1" />
                Starting from <span className="text-gray-400 font-normal">(optional)</span>
              </label>

              {/* My Location button */}
              <div className="flex justify-center mb-2">
                <button
                  type="button"
                  onClick={handleMyLocation}
                  disabled={isLocating}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-[#D97757]/70 bg-[#F5EFE6]/60 text-[#0B1F2A] font-medium text-sm hover:bg-[#F5EFE6] transition-all disabled:opacity-60"
                >
                  {isLocating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <LocateFixed size={16} />
                  )}
                  {isLocating ? "Locating..." : "Use My Location"}
                </button>
              </div>

              <div className="relative" ref={inputWrapperRef}>
                <input
                  type="text"
                  value={locationText}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  onFocus={() =>
                    suggestions.length > 0 && setShowSuggestions(true)
                  }
                  placeholder="e.g. Jibhi, Manali, Goa..."
                  className="w-full bg-white border border-[#0B1F2A]/12 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#D97757]/70 focus:ring-2 focus:ring-[#D97757]/20 transition-all text-center"
                />
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.ul
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-[#0B1F2A]/12 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto"
                    >
                      {suggestions.map((s, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => handleSelectSuggestion(s)}
                            className="w-full text-left px-4 py-3 hover:bg-[#F5EFE6]/60 transition-colors flex items-start gap-3 border-b border-gray-50 last:border-b-0"
                          >
                            <MapPin
                              size={14}
                              className="text-[#D97757] mt-0.5 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {s.name}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {s.fullName}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Duration ──────────────────────────────── */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-600 mb-2.5 text-center">
                Trip duration (days)
              </label>
              <div className="flex justify-center gap-2 flex-wrap">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`w-10 h-10 rounded-full text-sm font-semibold border-2 transition-all ${
                      duration === d
                        ? "bg-[#D97757] border-[#D97757] text-white shadow-md"
                        : "bg-white border-gray-200 text-gray-600 hover:border-[#D97757]/70"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Summary strip ─────────────────────────── */}
            <div className="bg-[#F5EFE6]/60/80 rounded-xl px-4 py-3 mb-5 text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">Your trip</p>
              <p className="text-sm font-medium text-gray-700">
                {selectedPlace?.name || locationText || "My Location"} ·{" "}
                ₹{budget.toLocaleString("en-IN")} · {duration} days ·{" "}
                {travelerCount} {travelerCount === 1 ? "person" : "people"} ·{" "}
                {travelerType.charAt(0).toUpperCase() + travelerType.slice(1)}
              </p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle
                  size={14}
                  className="text-red-500 mt-0.5 shrink-0"
                />
                <p className="text-xs text-red-600">{error}</p>
              </motion.div>
            )}

            {/* ── Actions ───────────────────────────────── */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFlowStep("landing")}
                className="px-5 py-3 rounded-xl text-gray-500 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Back
              </button>
              <motion.button
                onClick={handleFindDestinations}
                disabled={!isReady}
                className="flex-1 py-3.5 rounded-xl text-white font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isReady
                    ? "linear-gradient(135deg, #D97757, #B85F44)"
                    : "#d1d5db",
                  boxShadow: isReady
                    ? "0 8px 30px rgba(245,158,11,0.3)"
                    : "none",
                }}
                whileHover={isReady ? { scale: 1.02 } : {}}
                whileTap={isReady ? { scale: 0.97 } : {}}
              >
                Find Destinations →
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

