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
  if (fit === "stretch") return "#f59e0b";
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
              <div style="font-size:11px;color:#666">${dest.state}</div>
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
  const handleBuildItinerary = useCallback(
    async (dest: Destination) => {
      setIsGenerating(true);
      setGeneratingItinerary(true);

      const interestStr =
        categories.length > 0 ? ` focusing on ${categories.join(", ")}` : "";
      const autoMsg = `Plan a ${duration}-day trip to ${dest.name}, ${dest.state} with a budget of ₹${budget.toLocaleString("en-IN")} for ${tripType} traveler(s)${interestStr}. Generate the full itinerary now.`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort("Request timed out"), 45000);
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
        setGeneratedItinerary(data.itineraryTable ? data : null);
      } catch (err) {
        console.error("[PLAN] error:", err);
        setGeneratedItinerary(null);
      } finally {
        setIsGenerating(false);
        setGeneratingItinerary(false);
        setUserLocation({ name: dest.name, coordinates: dest.coordinates });
        setStoreDuration(duration);
        selectDestination(dest.name);
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
      {/* Loading overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <Loader2 size={40} className="animate-spin text-amber-500 mx-auto mb-4" />
              <p className={`font-serif text-xl font-bold text-gray-800`}>
                Building your itinerary...
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Our AI is crafting the perfect trip
              </p>
            </div>
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
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <button
              onClick={() => setFlowStep("budget")}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={18} className="text-gray-600" />
            </button>
            <div>
              <p className="text-[10px] tracking-[0.2em] text-amber-600 font-semibold uppercase">
                Velosta
              </p>
              <h2 className={`font-serif text-lg font-bold text-gray-800`}>
                Explore
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
                <div className="absolute inset-0 bg-amber-100 rounded-full" />
                <div
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-[width] duration-75"
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
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-amber-500 rounded-full shadow border-2 border-white pointer-events-none transition-[left] duration-75"
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
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-amber-400"
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
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-amber-400"
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
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-amber-400"
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
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-amber-600 transition-colors"
            >
              <FilterX size={13} />
              Clear Filters
            </button>
          </div>

          {/* Bottom: count + legend */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/80">
            <p className="text-xs font-semibold text-gray-600 mb-2">
              Matching destinations:{" "}
              <span className="text-amber-600">{filtered.length}</span>
            </p>
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Within budget
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Stretch
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Over
              </span>
            </div>
            <button
              onClick={() => setIsSatellite(!isSatellite)}
              className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-amber-600 transition-colors"
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
          className="h-full bg-white/95 backdrop-blur-lg border-l border-gray-200 flex flex-col z-20 shadow-lg"
          initial={{ x: 320 }}
          animate={{ x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{ width: 300 }}
        >
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className={`font-serif text-lg font-bold text-gray-800`}>
              All Destinations
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {filtered.length} places match your filters
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-4xl mb-3">🗺️</p>
                <p className="text-sm font-medium text-gray-600">
                  No destinations match
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Try adjusting your filters
                </p>
              </div>
            ) : (
              filtered.map((dest) => {
                const fit = getBudgetFit(dest, budget);
                const color = getBudgetColor(fit);
                return (
                  <button
                    key={dest.id}
                    onClick={() => setSelectedDest(dest)}
                    className={`w-full text-left px-5 py-3.5 border-b border-gray-50 hover:bg-amber-50/50 transition-colors flex items-start gap-3 ${
                      hoveredDest?.id === dest.id ? "bg-amber-50/50" : ""
                    }`}
                  >
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{
                        background: `${color}15`,
                        border: `2px solid ${color}40`,
                      }}
                    >
                      {dest.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {dest.name}
                      </p>
                      <p className="text-xs text-gray-400">{dest.state}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                        <span>
                          ₹{(dest.costMin / 1000).toFixed(0)}K–₹
                          {(dest.costMax / 1000).toFixed(0)}K
                        </span>
                        <span>·</span>
                        <span>
                          {dest.durationMin}–{dest.durationMax}d
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 mt-1 shrink-0" />
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
                    <MapPin size={12} /> {selectedDest.state}
                  </p>

                  <div className="flex items-center gap-4 mt-3 text-sm text-white/90">
                    <span className="flex items-center gap-1">
                      <Clock size={14} className="text-amber-300" />
                      {selectedDest.durationMin}–{selectedDest.durationMax} days
                    </span>
                    <span className="flex items-center gap-1">
                      <IndianRupee size={14} className="text-amber-300" />
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
                        className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium"
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
                        className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-xl"
                      >
                        <span className="text-lg shrink-0">{p.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            {p.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {p.desc}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-gray-600">
                            {p.cost}
                          </p>
                          <p className="text-[10px] text-amber-500 flex items-center gap-0.5 justify-end">
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
                        className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium capitalize"
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
                    className="px-4 py-3 rounded-xl text-gray-500 text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    Other Options
                  </button>
                  <motion.button
                    onClick={() => handleBuildItinerary(selectedDest)}
                    disabled={isGenerating}
                    className="flex-1 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      boxShadow: "0 8px 30px rgba(245,158,11,0.3)",
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
