"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Loader2,
  X,
  Star,
  Layers,
  FilterX,
  User,
  Heart,
  Users,
  Home,
  ChevronRight,
  IndianRupee,
} from "lucide-react";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useUser } from "@/app/utils/context";
import { DESTINATIONS, type Destination } from "@/lib/data/destinations";
import { generatePlannerResponse } from "@/lib/services/planner-service";
import { hydrateItineraryIntoStores } from "@/lib/services/itinerary-hydrator";
import { ApiError } from "@/lib/api";
import SignInGate from "@/components/velosta-ai/sign-in-gate";
import CloudOverlay from "./cloud-overlay";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const CATEGORY_OPTIONS = [
  { id: "nature", label: "Nature", emoji: "🌿" },
  { id: "culture", label: "Culture", emoji: "🏛️" },
  { id: "adventure", label: "Adventure", emoji: "🏔️" },
  { id: "relaxation", label: "Relaxation", emoji: "🧘" },
  { id: "food", label: "Food", emoji: "🍜" },
  { id: "nightlife", label: "Nightlife", emoji: "🌃" },
  { id: "photography", label: "Photography", emoji: "📸" },
  { id: "shopping", label: "Shopping", emoji: "🛍️" },
  { id: "wellness", label: "Wellness", emoji: "💆" },
];

const TRAVELER_TYPES = [
  { id: "solo", label: "Solo", Icon: User },
  { id: "couple", label: "Couple", Icon: Heart },
  { id: "friends", label: "Friends", Icon: Users },
  { id: "family", label: "Family", Icon: Home },
] as const;

const DURATION_OPTIONS = [2, 3, 5, 7, 10, 14];

function getBudgetFit(dest: Destination, budget: number): "perfect" | "stretch" | "over" {
  if (dest.costMax <= budget) return "perfect";
  if (dest.costMin <= budget) return "stretch";
  return "over";
}

function getBudgetColor(fit: "perfect" | "stretch" | "over") {
  if (fit === "perfect") return "#22c55e";
  if (fit === "stretch") return "#D97757";
  return "#ef4444";
}

// ────────────────────────────────────────────────────────────────────────────

export default function ExploreMapView() {
  const {
    setFlowStep,
    budgetAmount,
    duration: storeDuration,
    travelerType: storeTravelerType,
    interests: storeInterests,
    userLocation,
    setGeneratedItinerary,
    setGeneratingItinerary,
    selectDestination,
    setUserLocation,
    setDuration: setStoreDuration,
  } = useOnboardingStore();
  const { accessToken } = useUser();

  // ── Filter state (seeded from store) ──
  const [budget, setBudget] = useState(budgetAmount);
  const [duration, setDuration] = useState(storeDuration);
  const [tripType, setTripType] = useState(storeTravelerType);
  const [categories, setCategories] = useState<string[]>([...storeInterests]);
  const [isSatellite, setIsSatellite] = useState(false);

  // ── UI state ──
  const [hoveredDest, setHoveredDest] = useState<Destination | null>(null);
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSignInGate, setShowSignInGate] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // ── Refs ──
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // ── Filter destinations ──
  const filtered = useMemo(() => {
    return DESTINATIONS.filter((d) => {
      if (d.costMin > budget) return false;
      if (d.durationMin > duration) return false;
      if (tripType && !d.bestFor.includes(tripType)) return false;
      if (categories.length > 0 && !categories.some((c) => d.categories.includes(c)))
        return false;
      return true;
    });
  }, [budget, duration, tripType, categories]);

  const sliderPct = ((budget - 1000) / (50000 - 1000)) * 100;

  // ── Initialize map ──
  useEffect(() => {
    if (!mapContainerRef.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: userLocation?.coordinates ?? [78.9629, 20.5937],
      zoom: userLocation ? 6 : 4.5,
      pitch: 20,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    map.on("load", () => {
      mapRef.current = map;
      map.resize();
      setMapLoaded(true);
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toggle satellite ──
  useEffect(() => {
    if (!mapRef.current) return;
    setMapLoaded(false);
    const map = mapRef.current;
    map.once("style.load", () => setMapLoaded(true));
    map.setStyle(
      isSatellite
        ? "mapbox://styles/mapbox/satellite-streets-v12"
        : "mapbox://styles/mapbox/streets-v12"
    );
  }, [isSatellite]);

  // ── Update markers ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear old markers + popup
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    const bounds = new mapboxgl.LngLatBounds();

    filtered.forEach((dest) => {
      const fit = getBudgetFit(dest, budget);
      const color = getBudgetColor(fit);

      const el = document.createElement("div");
      el.style.cssText = "cursor:pointer;z-index:1;";

      const markerBubble = document.createElement("div");
      markerBubble.style.cssText = `
        width:42px;height:42px;border-radius:50%;
        background:${color};color:white;display:flex;
        align-items:center;justify-content:center;
        font-size:18px;border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        transition:transform 0.2s;
      `;
      markerBubble.textContent = dest.emoji;
      el.appendChild(markerBubble);

      el.addEventListener("mouseenter", () => {
        markerBubble.style.transform = "scale(1.3)";
        el.style.zIndex = "10";
        setHoveredDest(dest);

        const popup = new mapboxgl.Popup({
          offset: 28,
          closeButton: false,
          closeOnClick: false,
          maxWidth: "260px",
        })
          .setHTML(
            `<div style="font-family:system-ui;padding:4px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:20px">${dest.emoji}</span>
            <div>
              <div style="font-weight:700;font-size:14px">${dest.name}</div>
              <div style="font-size:11px;color:#666">${dest.state}${dest.country && dest.country !== "India" ? " · " + dest.country : ""}</div>
            </div>
          </div>
          <div style="display:flex;gap:12px;font-size:11px;color:#555;margin-bottom:4px">
            <span>⏱ ${dest.durationMin}–${dest.durationMax}d</span>
            <span>💰 ₹${(dest.costMin / 1000).toFixed(0)}K–₹${(dest.costMax / 1000).toFixed(0)}K</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${dest.highlights
              .slice(0, 3)
              .map(
                (h) =>
                  `<span style="background:#f3f4f6;padding:2px 6px;border-radius:8px;font-size:10px">${h}</span>`
              )
              .join("")}
          </div>
          <div style="margin-top:4px">
            <span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:600;color:white;background:${color}">
              ${fit === "perfect" ? "✓ Within budget" : fit === "stretch" ? "~ Stretch" : "✗ Over budget"}
            </span>
          </div>
        </div>`
          )
          .setLngLat(dest.coordinates);

        if (popupRef.current) popupRef.current.remove();
        popup.addTo(map);
        popupRef.current = popup;
      });

      el.addEventListener("mouseleave", () => {
        markerBubble.style.transform = "scale(1)";
        el.style.zIndex = "1";
        setHoveredDest(null);
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
      });

      el.addEventListener("click", () => {
        setSelectedDest(dest);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(dest.coordinates)
        .addTo(map);
      markersRef.current.push(marker);
      bounds.extend(dest.coordinates);
    });

    if (filtered.length === 1) {
      map.flyTo({ center: filtered[0].coordinates, zoom: 8, duration: 1000 });
    } else if (filtered.length > 1) {
      try {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        if (
          Number.isFinite(ne.lng) &&
          Number.isFinite(ne.lat) &&
          Number.isFinite(sw.lng) &&
          Number.isFinite(sw.lat)
        ) {
          map.fitBounds(bounds, {
            padding: { top: 80, bottom: 80, left: 350, right: 330 },
            maxZoom: 8,
            duration: 1000,
          });
        }
      } catch {
        // bounds empty or invalid — skip
      }
    }
  }, [filtered, budget, mapLoaded]);

  // ── Build Itinerary ──
  // Owns the entire generation lifecycle so the planner page never lands
  // empty: hydrate context → sign-in gate → call planner → push into stores
  // → advance to planner step.
  const handleBuildItinerary = useCallback(
    async (dest: Destination) => {
      // Hydrate planner store with the user's chosen context
      setUserLocation({ name: dest.name, coordinates: dest.coordinates });
      setStoreDuration(duration);

      // Sign-in gate — generation requires auth
      if (!accessToken) {
        setShowSignInGate(true);
        return;
      }

      const interestStr =
        categories.length > 0 ? ` focusing on ${categories.join(", ")}` : "";
      const locationStr = dest.country && dest.country !== "India"
        ? `${dest.name}, ${dest.state}, ${dest.country}`
        : `${dest.name}, ${dest.state}`;
      const autoMsg = `Plan a ${duration}-day trip to ${locationStr} with a budget of ₹${budget.toLocaleString(
        "en-IN"
      )} for ${tripType} traveler(s)${interestStr}. Generate the full itinerary now.`;

      // Stash for any downstream consumer (e.g. mobile chat panel)
      try {
        sessionStorage.setItem("velosta:auto-prompt", autoMsg);
      } catch {
        /* sessionStorage may be blocked — non-fatal */
      }

      setGenerationError(null);
      setIsGenerating(true);
      setGeneratingItinerary(true);
      setGeneratedItinerary(null);

      let didSucceed = false;
      try {
        const response = await generatePlannerResponse({
          userSaid: autoMsg,
          conversationHistory: [],
          currentItinerary: null,
          isModificationRequest: false,
          destinationHint: dest.name,
        });

        if (!response.isTextResponse && response.itineraryTable) {
          await hydrateItineraryIntoStores(response, {
            destination: response.destination ?? dest.name,
            budget: response.totalEstimatedCost || response.totalBudget,
          });
          setGeneratedItinerary(response);
          didSucceed = true;
        } else {
          setGenerationError(
            response.isTextResponse
              ? response.message
              : "Velosta AI couldn't generate an itinerary. Please try again."
          );
        }
      } catch (err) {
        console.error("[EXPLORE-MAP] generation error:", err);
        setGenerationError(
          err instanceof ApiError
            ? err.message
            : "Could not reach Velosta AI. Please try again."
        );
      } finally {
        setIsGenerating(false);
        setGeneratingItinerary(false);
        if (didSucceed) {
          setSelectedDest(null);
          // Triggers flowStep → "planner"
          selectDestination(dest.name);
        }
      }
    },
    [
      budget,
      duration,
      tripType,
      categories,
      accessToken,
      setGeneratedItinerary,
      setGeneratingItinerary,
      setUserLocation,
      setStoreDuration,
      selectDestination,
    ]
  );

  const clearFilters = () => {
    setBudget(budgetAmount);
    setDuration(storeDuration);
    setTripType(storeTravelerType);
    setCategories([...storeInterests]);
  };

  const toggleCategory = (id: string) => {
    setCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
        <p className="text-red-500">Mapbox token missing.</p>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Sign-in gate — generation requires auth */}
      <SignInGate
        open={showSignInGate}
        onClose={() => setShowSignInGate(false)}
        next="/velosta-ai"
        title="Sign in to craft your itinerary"
        message="We have your trip details ready. Sign in and Velosta AI will build your day-by-day plan."
      />

      {/* Cinematic crafting overlay while AI works */}
      <CloudOverlay
        visible={isGenerating}
        mode="crafting"
        message="Your itinerary is being crafted"
        sublines={[
          "Tracing the best route through your destination\u2026",
          "Mapping stays, food and golden-hour stops\u2026",
          "Tuning the plan to your budget and pace\u2026",
        ]}
      />

      {/* Inline error toast */}
      <AnimatePresence>
        {generationError && (
          <motion.div
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[10001] max-w-md px-4 py-3 rounded-xl bg-red-50 border border-red-200 shadow-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <p className="text-xs text-red-600">{generationError}</p>
            <button
              onClick={() => setGenerationError(null)}
              className="absolute top-1.5 right-2 text-red-400 hover:text-red-600 text-xs"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 flex bg-gray-100">
        {/* ── Left Sidebar: Filters ─────────────────────────────── */}
        <motion.div
          className="h-full bg-white/95 backdrop-blur-lg border-r border-gray-200 flex flex-col z-20 shadow-lg"
          initial={{ x: -320 }}
          animate={{ x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{ width: 300 }}
        >
          {/* Header — FlowChrome already shows brand; just a back affordance + section label */}
          <div className="px-5 pt-20 pb-4 border-b border-gray-100 flex items-center gap-3">
            <button
              onClick={() => setFlowStep("budget")}
              className="p-1.5 rounded-lg hover:bg-[#F5EFE6] transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={18} className="text-[#0B1F2A]" />
            </button>
            <div>
              <p className="text-[10px] tracking-[0.24em] text-[#2F6F73] font-semibold uppercase">
                Discover
              </p>
              <h2 className="font-serif text-[17px] font-semibold text-[#0B1F2A] leading-tight">
                Refine your journey
              </h2>
            </div>
          </div>

          {/* Scrollable filters */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Budget */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Budget
              </label>
              <div className="text-center mb-2">
                <span className="text-xl font-bold text-gray-800">
                  ₹{budget.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="relative w-full h-2 rounded-full">
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
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[#D97757] rounded-full shadow border-2 border-white pointer-events-none transition-[left] duration-75"
                  style={{ left: `calc(${sliderPct}% - 8px)` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                <span>₹1K</span>
                <span>₹50K</span>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      duration === d
                        ? "bg-[#D97757] border-[#D97757] text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-[#D97757]/70"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* Trip Type */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Trip Type
              </label>
              <div className="flex flex-wrap gap-2">
                {TRAVELER_TYPES.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTripType(tripType === id ? "" : id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      tripType === id
                        ? "bg-[#D97757] border-[#D97757] text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-[#D97757]/70"
                    }`}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map(({ id, label, emoji }) => (
                  <button
                    key={id}
                    onClick={() => toggleCategory(id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      categories.includes(id)
                        ? "bg-[#D97757] border-[#D97757] text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-[#D97757]/70"
                    }`}
                  >
                    <span>{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-[#2F6F73] transition-colors"
            >
              <FilterX size={13} />
              Clear Filters
            </button>
          </div>

          {/* Bottom: count + legend */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/80">
            <p className="text-xs font-semibold text-gray-600 mb-2">
              Matching destinations:{" "}
              <span className="text-[#2F6F73]">{filtered.length}</span>
            </p>
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Within budget
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97757]" /> Stretch
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Over
              </span>
            </div>
            <button
              onClick={() => setIsSatellite(!isSatellite)}
              className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-[#2F6F73] transition-colors"
            >
              <Layers size={12} />
              {isSatellite ? "Street View" : "Satellite View"}
            </button>
          </div>
        </motion.div>

        {/* ── Map ────────────────────────────────────────────────── */}
        <div className="flex-1 relative min-w-0 min-h-0 z-10">
          <div
            ref={mapContainerRef}
            className="absolute inset-0"
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        {/* ── Right Sidebar: Destination List ────────────────────── */}
        <motion.div
          className="h-full bg-[#FBF8F3]/95 backdrop-blur-lg border-l border-[#0B1F2A]/8 flex flex-col z-20 shadow-[0_18px_40px_-20px_rgba(11,31,42,0.18)]"
          initial={{ x: 320 }}
          animate={{ x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{ width: 320 }}
        >
          <div className="px-6 pt-20 pb-4 border-b border-[#0B1F2A]/8">
            <p className="text-[10px] tracking-[0.24em] text-[#2F6F73] font-semibold uppercase">
              Destinations
            </p>
            <h3 className="font-serif text-[18px] font-semibold text-[#0B1F2A] leading-tight mt-1">
              Curated for your trip
            </h3>
            <p className="text-[11.5px] text-[#0B1F2A]/55 mt-1.5">
              {filtered.length} {filtered.length === 1 ? "place" : "places"} match your filters
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <div
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: "rgba(47,111,115,0.08)",
                    border: "1px solid rgba(47,111,115,0.18)",
                  }}
                >
                  <MapPin size={18} className="text-[#2F6F73]" strokeWidth={1.6} />
                </div>
                <p className="text-[13px] font-medium text-[#0B1F2A]">
                  No matches yet
                </p>
                <p className="text-[11.5px] text-[#0B1F2A]/50 mt-1 leading-relaxed">
                  Try widening your budget or<br/>removing a category.
                </p>
              </div>
            ) : (
              filtered.map((dest) => {
                const fit = getBudgetFit(dest, budget);
                const color = getBudgetColor(fit);
                const active = hoveredDest?.id === dest.id;
                return (
                  <button
                    key={dest.id}
                    onClick={() => setSelectedDest(dest)}
                    className="group w-full text-left px-6 py-3.5 border-b border-[#0B1F2A]/5 hover:bg-[#F5EFE6]/50 transition-colors flex items-start gap-3.5"
                    style={{
                      backgroundColor: active ? "rgba(245,239,230,0.5)" : "transparent",
                    }}
                  >
                    <span
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0"
                      style={{
                        background: `${color}14`,
                        border: `1.5px solid ${color}38`,
                      }}
                    >
                      {dest.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-[#0B1F2A] truncate">
                        {dest.name}
                      </p>
                      <p className="text-[11.5px] text-[#0B1F2A]/50 mt-0.5">{dest.state}{dest.country && dest.country !== "India" ? ` · ${dest.country}` : ""}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[10.5px] font-medium text-[#0B1F2A]/60">
                        <span>
                          ₹{(dest.costMin / 1000).toFixed(0)}K–{(dest.costMax / 1000).toFixed(0)}K
                        </span>
                        <span className="text-[#0B1F2A]/25">·</span>
                        <span>
                          {dest.durationMin}–{dest.durationMax}d
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-[#0B1F2A]/25 mt-2 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-[#D97757]"
                    />
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Detail Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedDest && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedDest(null)}
            />

            {/* Modal card */}
            <motion.div
              className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
            >
              {/* Header with satellite image */}
              <div className="relative rounded-t-2xl overflow-hidden">
                {/* Satellite image from Mapbox Static API */}
                <img
                  src={`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${selectedDest.coordinates[0]},${selectedDest.coordinates[1]},11,0/500x250@2x?access_token=${MAPBOX_TOKEN}`}
                  alt={selectedDest.name}
                  className="w-full h-48 object-cover"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                <button
                  onClick={() => setSelectedDest(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-black/30 hover:bg-black/50 transition-colors backdrop-blur-sm"
                >
                  <X size={16} className="text-white" />
                </button>

                {/* Emoji badge */}
                <span className="absolute top-4 left-4 text-2xl bg-white/90 backdrop-blur-sm w-10 h-10 flex items-center justify-center rounded-xl shadow-sm">
                  {selectedDest.emoji}
                </span>

                {/* Text overlay */}
                <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
                  <h2 className="font-serif text-2xl font-bold text-white drop-shadow-lg">
                    {selectedDest.name}
                  </h2>
                  <p className="text-sm text-white/80 flex items-center gap-1 mt-0.5">
                    <MapPin size={12} /> {selectedDest.state}{selectedDest.country && selectedDest.country !== "India" ? ` · ${selectedDest.country}` : ""}
                  </p>

                  <div className="flex items-center gap-4 mt-3 text-sm text-white/90">
                    <span className="flex items-center gap-1">
                      <Clock size={14} className="text-[#E89378]" />
                      {selectedDest.durationMin}–{selectedDest.durationMax} days
                    </span>
                    <span className="flex items-center gap-1">
                      <IndianRupee size={14} className="text-[#E89378]" />
                      {selectedDest.costMin.toLocaleString("en-IN")}–
                      {selectedDest.costMax.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Budget fit badge */}
                  {(() => {
                    const fit = getBudgetFit(selectedDest, budget);
                    return (
                      <span
                        className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ background: getBudgetColor(fit) }}
                    >
                      {fit === "perfect"
                        ? "✓ Within budget"
                        : fit === "stretch"
                          ? "~ Stretch"
                          : "✗ Over budget"}
                    </span>
                  );
                })()}
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-5 space-y-5">
                {/* Highlights */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Highlights
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDest.highlights.map((h, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-[#F5EFE6]/60 text-[#0B1F2A] rounded-full text-xs font-medium"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Top Places */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Top Places
                  </h3>
                  <div className="space-y-2">
                    {selectedDest.topPlaces.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-2.5 bg-[#FBF8F3] border border-[#0B1F2A]/6 rounded-xl"
                      >
                        <span className="text-lg shrink-0">{p.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#0B1F2A]">
                            {p.name}
                          </p>
                          <p className="text-xs text-[#0B1F2A]/50 mt-0.5">
                            {p.desc}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-[#0B1F2A]/80">
                            {p.cost}
                          </p>
                          <p className="text-[10px] text-[#D97757] flex items-center gap-0.5 justify-end">
                            <Star size={10} fill="currentColor" /> {p.rating}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Best For */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Best For
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDest.bestFor.map((b) => (
                      <span
                        key={b}
                        className="px-3 py-1 bg-[#F5EFE6]/60 border border-[#0B1F2A]/6 text-[#0B1F2A]/70 rounded-full text-xs font-medium capitalize"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setSelectedDest(null)}
                    className="px-4 py-3 rounded-xl text-[#0B1F2A]/55 text-sm font-medium hover:bg-[#F5EFE6]/60 transition-colors"
                  >
                    Other Options
                  </button>
                  <motion.button
                    onClick={() => handleBuildItinerary(selectedDest)}
                    disabled={isGenerating}
                    className="flex-1 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, #D97757, #B85F44)",
                      boxShadow: "0 14px 38px -10px rgba(217,119,87,0.55)",
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {isGenerating ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin" />{" "}
                        Generating...
                      </span>
                    ) : (
                      "Build Itinerary →"
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
