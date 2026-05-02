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
  ChevronUp,
  IndianRupee,
  SlidersHorizontal,
  Minus,
} from "lucide-react";
import { useOnboardingStore, type DiscoveredDestination } from "@/lib/stores/onboarding-store";
import { useUser } from "@/app/utils/context";
import { DESTINATIONS, type Destination } from "@/lib/data/destinations";
import { fetchDiscoveredDestinations } from "@/lib/services/destination-service";
import { generatePlannerStreamAsync } from "@/lib/services/planner-service";
import {
  commitItineraryToStores,
  enrichItineraryInBackground,
} from "@/lib/services/itinerary-hydrator";
import { buildTravelProfilePrompt } from "@/lib/services/travel-profile-prompt";
import { buildBudgetRealityMessage } from "@/lib/services/budget-feasibility";
import { ApiError } from "@/lib/api";
import { useBatchedStreamTokens } from "@/lib/hooks/use-batched-stream-tokens";
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

function generationTimeoutMs(days: number): number {
  if (days >= 30) return 12 * 60 * 1000;
  if (days >= 21) return 10 * 60 * 1000;
  if (days >= 14) return 8 * 60 * 1000;
  return 5 * 60 * 1000;
}

/** Map pin row: static catalog entry or AI-discovered place (same shape as Destination). */
type ExploreDestination = Destination & {
  source?: "ai";
  aiBudgetFit?: "perfect" | "stretch" | "premium";
};

const EMOJI_BY_CATEGORY: Record<string, string> = {
  nature: "🌿",
  culture: "🏛️",
  adventure: "🏔️",
  relaxation: "🧘",
  food: "🍜",
  nightlife: "🌃",
  photography: "📸",
  shopping: "🛍️",
  wellness: "💆",
};

function emojiForInterests(ids: string[]): string {
  for (const id of ids) {
    if (EMOJI_BY_CATEGORY[id]) return EMOJI_BY_CATEGORY[id];
  }
  return "📍";
}

function parseInrRange(label: string, budgetFallback: number): { costMin: number; costMax: number } {
  const normalized = label.replace(/,/g, "").replace(/₹/g, "");
  const nums = normalized.match(/\d+/g);
  if (!nums?.length) {
    const b = budgetFallback;
    return { costMin: Math.round(b * 0.65), costMax: Math.round(b * 1.25) };
  }
  const values = nums.map((s) => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : 0;
  });
  const scaled = values.map((v) => (v > 0 && v < 800 ? v * 1000 : v));
  if (scaled.length >= 2) {
    return {
      costMin: Math.round(Math.min(scaled[0], scaled[1])),
      costMax: Math.round(Math.max(scaled[0], scaled[1])),
    };
  }
  const v = scaled[0];
  return { costMin: Math.round(v * 0.85), costMax: Math.round(v * 1.15) };
}

function discoveredToExploreDestination(
  d: DiscoveredDestination,
  ctx: { budget: number; categories: string[]; tripType: string }
): ExploreDestination {
  const { costMin, costMax } = parseInrRange(d.estimatedCost, ctx.budget);
  const days = Math.max(1, d.recommendedDays);
  const hl =
    d.highlights.length > 0
      ? d.highlights
      : d.tagline
        ? [d.tagline]
        : ["Curated pick for your trip"];
  const topPlaces = hl.slice(0, 5).map((name, i) => ({
    name,
    desc: i === 0 ? d.tagline || "" : "",
    cost: "—",
    rating: 4.5,
    emoji: emojiForInterests(ctx.categories),
  }));
  const bestFor = ctx.tripType
    ? Array.from(new Set([ctx.tripType, "solo", "couple", "friends", "family"]))
    : ["solo", "couple", "friends", "family"];
  return {
    id: d.id,
    name: d.name,
    state: d.state,
    coordinates: d.coordinates,
    emoji: emojiForInterests(ctx.categories),
    durationMin: Math.max(1, days - 1),
    durationMax: Math.min(14, days + 2),
    costMin,
    costMax,
    highlights: hl,
    topPlaces,
    bestFor,
    categories: [...ctx.categories],
    source: "ai",
    aiBudgetFit: d.budgetFit,
  };
}

function getBudgetFit(dest: ExploreDestination, budget: number): "perfect" | "stretch" | "over" {
  if (dest.source === "ai" && dest.aiBudgetFit) {
    if (dest.aiBudgetFit === "premium") return "over";
    if (dest.aiBudgetFit === "stretch") return "stretch";
    return "perfect";
  }
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
    planningMode,
    budgetAmount,
    duration: storeDuration,
    travelerType: storeTravelerType,
    travelerCount: storeTravelerCount,
    interests: storeInterests,
    userLocation,
    customDestination,
    setCustomDestination,
    setGeneratedItinerary,
    setGeneratingItinerary,
    selectDestination,
    startManualBuild,
    setUserLocation,
    setDuration: setStoreDuration,
    travelProfile,
    discoveredDestinations,
    setDiscoveredDestinations,
    isLoadingDestinations,
    setLoadingDestinations,
  } = useOnboardingStore();
  const { accessToken } = useUser();

  // ── Filter state (seeded from store) ──
  const [budget, setBudget] = useState(budgetAmount);
  const [duration, setDuration] = useState(storeDuration);
  const [tripType, setTripType] = useState(storeTravelerType);
  const [travelerCount, setTravelerCount] = useState(storeTravelerCount);
  const [categories, setCategories] = useState<string[]>([...storeInterests]);
  const [isSatellite, setIsSatellite] = useState(false);
  // ── UI state ──
  const [hoveredDest, setHoveredDest] = useState<ExploreDestination | null>(null);
  const [selectedDest, setSelectedDest] = useState<ExploreDestination | null>(null);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [discoverRequestKey, setDiscoverRequestKey] = useState(0);
  const [hasLoadedDiscoverResults, setHasLoadedDiscoverResults] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationDone, setGenerationDone] = useState(false);
  const [craftingPlace, setCraftingPlace] = useState<string>("");
  const [streamBuffer, setStreamBuffer] = useState<string | undefined>(undefined);
  const { appendToken, flushPending, resetQueue } = useBatchedStreamTokens(setStreamBuffer);
  // Ref holds the destination needed when user clicks "Open itinerary"
  const pendingDestRef = useRef<{ dest: ReturnType<typeof useOnboardingStore.getState>["selectDestination"] extends (d: infer D) => void ? D : string } | null>(null);

  // Safety timeout — if generation somehow never resolves, force-close the overlay
  useEffect(() => {
    if (!isGenerating) return;
    const timeoutMs = generationTimeoutMs(duration ?? 3);
    const safetyTimer = window.setTimeout(() => {
      setIsGenerating(false);
      setGenerationDone(false);
      setGeneratingItinerary(false);
      resetQueue();
      setStreamBuffer(undefined);
      setCraftingPlace("");
      setGenerationError("Generation timed out. Please try again.");
    }, timeoutMs);
    return () => window.clearTimeout(safetyTimer);
  }, [duration, isGenerating, resetQueue, setGeneratingItinerary]);

  const handleViewItinerary = useCallback(() => {
    const destName = (pendingDestRef.current as any)?.name as string | undefined;
    setIsGenerating(false);
    setGenerationDone(false);
    if (destName) selectDestination(destName);
  }, [selectDestination]);
  const [showSignInGate, setShowSignInGate] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  // Mobile-only UI state
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileListExpanded, setMobileListExpanded] = useState(false);
  const [mobileListHidden, setMobileListHidden] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  // ── Refs ──
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 1023px)");
    const sync = () => {
      const mobile = media.matches;
      setIsMobileView(mobile);
      if (!mobile) {
        setMobileListHidden(false);
        setMobileListExpanded(false);
      }
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // ── Static catalog (fallback when signed out or discovery fails) ──
  const staticFiltered = useMemo(() => {
    return DESTINATIONS.filter((d) => {
      if (d.costMin > budget) return false;
      if (d.durationMin > duration) return false;
      if (tripType && !d.bestFor.includes(tripType)) return false;
      if (categories.length > 0 && !categories.some((c) => d.categories.includes(c)))
        return false;
      return true;
    });
  }, [budget, duration, tripType, categories]);

  const displayPlaces = useMemo((): ExploreDestination[] => {
    if (accessToken) {
      return discoveredDestinations.map((d) =>
        discoveredToExploreDestination(d, { budget, categories, tripType })
      );
    }
    return staticFiltered;
  }, [accessToken, discoveredDestinations, staticFiltered, budget, categories, tripType]);

  // ── AI discovery (signed-in): preferences + travel profile → map pins ──
  const discoverDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Never run destination discovery while itinerary generation/ready overlay is active.
    // Otherwise the full-page discover loader can replace the generation experience.
    if (isGenerating || generationDone) return;

    // For explicit custom destinations from intent-capture, skip personalized
    // discovery entirely and let auto-build generate the itinerary directly.
    if (customDestination) {
      setLoadingDestinations(false);
      setDiscoverError(null);
      setHasLoadedDiscoverResults(true);
      return;
    }

    if (!accessToken) {
      setDiscoverError(null);
      setLoadingDestinations(false);
      setHasLoadedDiscoverResults(true);
      return;
    }
    // Always fetch a fresh response for current preferences before showing results.
    setHasLoadedDiscoverResults(false);
    setDiscoveredDestinations([]);
    // Cover debounce window so the explore UI does not mount before the first request starts.
    setLoadingDestinations(true);
    setDiscoverError(null);
    if (discoverDebounceRef.current) clearTimeout(discoverDebounceRef.current);
    discoverDebounceRef.current = setTimeout(() => {
      discoverDebounceRef.current = null;
      const loc = userLocation ?? {
        name: "India",
        coordinates: [78.9629, 20.5937] as [number, number],
      };
      const profileCtx = buildTravelProfilePrompt(travelProfile);
      void (async () => {
        try {
          const list = await fetchDiscoveredDestinations({
            budget: {
              min: Math.max(1000, Math.round(budget * 0.35)),
              max: Math.max(budget, 1000),
              label: `Up to ₹${budget.toLocaleString("en-IN")} per person`,
            },
            duration,
            userLocation: loc,
            interests: categories,
            travelerType: tripType,
            travelerCount,
            travelProfileContext: profileCtx,
            destinationHint: customDestination?.name,
          });
          setDiscoveredDestinations(list);
        } catch (e) {
          console.error("[explore-map] discover destinations:", e);
          setDiscoveredDestinations([]);
          setDiscoverError("Personalized picks unavailable right now. Please retry.");
        } finally {
          setLoadingDestinations(false);
          setHasLoadedDiscoverResults(true);
        }
      })();
    }, 650);
    return () => {
      if (discoverDebounceRef.current) {
        clearTimeout(discoverDebounceRef.current);
        discoverDebounceRef.current = null;
      }
    };
  }, [
    accessToken,
    budget,
    duration,
    tripType,
    travelerCount,
    categories,
    userLocation,
    travelProfile,
    customDestination?.name,
    discoverRequestKey,
    isGenerating,
    generationDone,
    setHasLoadedDiscoverResults,
    setDiscoveredDestinations,
    setLoadingDestinations,
  ]);

  /** Full-screen loader until fresh AI response for current preferences arrives. */
  const waitingForAiPlaces =
    !!accessToken &&
    !customDestination &&
    !isGenerating &&
    !generationDone &&
    !hasLoadedDiscoverResults;

  const discoverErrorFullPage =
    !!accessToken &&
    !customDestination &&
    !isLoadingDestinations &&
    discoveredDestinations.length === 0 &&
    !!discoverError;

  /** Map container is in the DOM only after loading / error gates — init must re-run when this becomes true. */
  const mapHostVisible =
    !!MAPBOX_TOKEN && !waitingForAiPlaces && !discoverErrorFullPage;

  const sliderPct = ((budget - 1000) / (50000 - 1000)) * 100;

  // ── Initialize map (after gates — ref exists; first mount used to skip when ref was null) ──
  useEffect(() => {
    if (!mapHostVisible) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapLoaded(false);
      }
      return;
    }

    const el = mapContainerRef.current;
    if (!el || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: el,
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
      if (mapRef.current === map) {
        mapRef.current = null;
      }
      setMapLoaded(false);
    };
  }, [
    mapHostVisible,
    userLocation?.coordinates?.[0],
    userLocation?.coordinates?.[1],
  ]);

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

    displayPlaces.forEach((dest) => {
      const fit = getBudgetFit(dest, budget);
      const color = getBudgetColor(fit);

      const el = document.createElement("div");
      el.style.cssText = "cursor:pointer;z-index:1;";

      const markerBubble = document.createElement("div");
      if (isMobileView) {
        // Mobile: keep markers light and precise (no bulky bubble background).
        markerBubble.style.cssText = `
          width:12px;height:12px;border-radius:50%;
          background:${color};display:flex;
          align-items:center;justify-content:center;
          border:2px solid white;
          box-shadow:0 1px 4px rgba(0,0,0,0.22);
          transition:transform 0.16s;
        `;
      } else {
        markerBubble.style.cssText = `
          width:42px;height:42px;border-radius:50%;
          background:${color};color:white;display:flex;
          align-items:center;justify-content:center;
          font-size:18px;border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          transition:transform 0.2s;
        `;
        markerBubble.textContent = dest.emoji;
      }
      el.appendChild(markerBubble);

      el.addEventListener("mouseenter", () => {
        if (isMobileView) return;
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
              ${fit === "perfect" ? "Within budget" : fit === "stretch" ? "Stretch" : "Over budget"}
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
        if (isMobileView) return;
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

    if (displayPlaces.length === 1) {
      map.flyTo({ center: displayPlaces[0].coordinates, zoom: 8, duration: 1000 });
    } else if (displayPlaces.length > 1) {
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
            padding: isMobileView
              ? { top: 120, bottom: 300, left: 36, right: 36 }
              : { top: 80, bottom: 80, left: 350, right: 330 },
            maxZoom: 8,
            duration: 1000,
          });
        }
      } catch {
        // bounds empty or invalid — skip
      }
    }
  }, [displayPlaces, budget, mapLoaded, isMobileView]);

  // ── Build Itinerary ──
  // Owns the entire generation lifecycle so the planner page never lands
  // empty: hydrate context → sign-in gate → call planner → push into stores
  // → advance to planner step.
  const handleBuildItinerary = useCallback(
    async (dest: ExploreDestination, locationOverride?: string) => {
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
      const locationStr = locationOverride
        ?? (dest.country && dest.country !== "India"
          ? `${dest.name}, ${dest.state}, ${dest.country}`
          : `${dest.name}, ${dest.state}`);
      const originStr = userLocation?.name
        ? ` Starting from ${userLocation.name} — Day 1 must include travel from ${userLocation.name} to ${dest.name} with the transport mode (flight/train/bus/road) and estimated cost.`
        : "";
      const autoMsg = `Plan a ${duration}-day trip to ${locationStr} with a budget of ₹${budget.toLocaleString(
        "en-IN"
      )} for ${travelerCount} ${tripType} traveler(s)${interestStr}.${originStr} Generate the full itinerary now.`;
      const profilePrompt = buildTravelProfilePrompt(travelProfile);
      const budgetReality = buildBudgetRealityMessage({
        destination: dest.name,
        days: duration,
        currentBudgetPerPerson: budget,
      });
      if (budgetReality) {
        setGenerationError(budgetReality.message);
        setIsGenerating(false);
        setGeneratingItinerary(false);
        return;
      }
      const fullPrompt = `${autoMsg}${profilePrompt}`;

      // Stash for any downstream consumer (e.g. mobile chat panel)
      try {
        sessionStorage.setItem("velosta:auto-prompt", fullPrompt);
      } catch {
        /* sessionStorage may be blocked — non-fatal */
      }

      setGenerationError(null);
      if (planningMode === "manual") {
        // Manual planning path: skip AI generation and continue to
        // day-wise drag/drop builder with the selected destination context.
        startManualBuild(dest.name);
        setSelectedDest(null);
        return;
      }
      const runId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now());
      try {
        window.localStorage.setItem(
          "velosta:itineraryStatus",
          JSON.stringify({
            runId,
            status: "generating",
            destination: dest.name,
            updatedAt: Date.now(),
          })
        );
      } catch {
        // Non-fatal when storage is blocked
      }
      setCraftingPlace(dest.name);
      setIsGenerating(true);
      setGeneratingItinerary(true);
      setGeneratedItinerary(null);
      resetQueue();
      setStreamBuffer("");

      let didSucceed = false;
      try {
        const response = await generatePlannerStreamAsync(
          {
            userSaid: fullPrompt,
            conversationHistory: [],
            currentItinerary: null,
            isModificationRequest: false,
            destinationHint: dest.name,
            desiredDays: duration,
            desiredBudget: budget,
            travelProfileContext: profilePrompt,
          },
          appendToken
        );

        if (!response.isTextResponse && response.itineraryTable) {
          // Phase 1 — instant: commit raw data to store.
          commitItineraryToStores(response, {
            destination: response.destination ?? dest.name,
            budget: response.totalEstimatedCost || response.totalBudget,
          });
          setGeneratedItinerary(response);
          didSucceed = true;
          // Stash destination so handleViewItinerary can use it
          pendingDestRef.current = { name: response.destination ?? dest.name } as any;
          // Phase 2 — background: geocode markers quietly.
          enrichItineraryInBackground(response, response.destination ?? dest.name);
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
        setGeneratingItinerary(false);
        flushPending();
        setStreamBuffer(undefined);
        setCraftingPlace("");
        if (!didSucceed) {
          // On failure, close overlay so user isn't stuck
          setIsGenerating(false);
          setGenerationDone(false);
        }
        if (didSucceed) {
          // Keep overlay open and show the "ready" modal — user taps to proceed
          setGenerationDone(true);
          setSelectedDest(null);
          try {
            window.localStorage.setItem(
              "velosta:itineraryStatus",
              JSON.stringify({
                runId,
                status: "ready",
                destination: dest.name,
                updatedAt: Date.now(),
              })
            );
          } catch {
            // Non-fatal when storage is blocked
          }
        } else {
          try {
            window.localStorage.setItem(
              "velosta:itineraryStatus",
              JSON.stringify({
                runId,
                status: "failed",
                destination: dest.name,
                updatedAt: Date.now(),
              })
            );
          } catch {
            // ignore
          }
        }
      }
    },
    [
      appendToken,
      flushPending,
      resetQueue,
      budget,
      duration,
      tripType,
      travelerCount,
      categories,
      userLocation,
      accessToken,
      setGeneratedItinerary,
      setGeneratingItinerary,
      setUserLocation,
      setStoreDuration,
      selectDestination,
      startManualBuild,
      planningMode,
      travelProfile,
    ]
  );

  // ── Auto-build for custom destination from intent form ──────────
  useEffect(() => {
    if (!customDestination || !mapLoaded || isGenerating) return;
    // Parse fullName (e.g. "Goa, India" or "Manali, Himachal Pradesh, India")
    const parts = customDestination.fullName.split(",").map((p) => p.trim());
    const syntheticDest: ExploreDestination = {
      id: "custom-intent",
      name: customDestination.name,
      state: parts[1] ?? "",
      country: parts[2],
      coordinates: customDestination.coordinates,
      emoji: "📍",
      durationMin: 1,
      durationMax: 30,
      costMin: 0,
      costMax: 10_000_000,
      highlights: [],
      topPlaces: [],
      bestFor: [],
      categories: [],
    };
    // Clear before calling so we don't re-trigger on re-render
    setCustomDestination(null);
    handleBuildItinerary(syntheticDest, customDestination.fullName);
  }, [customDestination, mapLoaded, isGenerating, handleBuildItinerary, setCustomDestination]);

  // ── Dismiss destination card + popup when generation starts ──────────────
  useEffect(() => {
    if (!isGenerating) return;
    setSelectedDest(null);
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }
  }, [isGenerating]);

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

  if (waitingForAiPlaces) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#FBF8F3]">
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <Loader2 size={22} className="animate-spin text-[#2F6F73]" />
          <p className="text-sm font-medium text-[#0B1F2A]">
            Finding personalized places for your trip...
          </p>
          <p className="text-xs text-[#0B1F2A]/55 max-w-sm">
            We are using your budget, duration, trip type, and preferences to generate
            destination picks.
          </p>
        </div>
      </div>
    );
  }

  if (discoverErrorFullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#FBF8F3]">
        <div className="max-w-md rounded-2xl border border-[#0B1F2A]/10 bg-white p-6 text-center shadow-sm">
          <p className="text-base font-semibold text-[#0B1F2A]">Could not fetch AI places</p>
          <p className="mt-2 text-sm text-[#0B1F2A]/65">{discoverError}</p>
          <button
            onClick={() => setDiscoverRequestKey((v) => v + 1)}
            className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #D97757, #B85F44)" }}
          >
            Retry
          </button>
        </div>
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
        contextPlace={craftingPlace}
        liveTokenBuffer={streamBuffer}
        generationComplete={generationDone}
        onViewItinerary={handleViewItinerary}
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
        {/* ── Left Sidebar: Filters (desktop only) ─────────────── */}
        <motion.div
          className="hidden lg:flex h-full bg-white/95 backdrop-blur-lg border-r border-gray-200 flex-col z-20 shadow-lg"
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
              <span className="text-[#2F6F73]">{displayPlaces.length}</span>
            </p>
            {accessToken && isLoadingDestinations ? (
              <p className="text-[10px] text-[#2F6F73]/85 flex items-center gap-1.5 mb-2">
                <Loader2 size={12} className="animate-spin shrink-0" aria-hidden />
                Updating suggestions…
              </p>
            ) : null}
            {discoverError ? (
              <p className="text-[10px] text-amber-800/90 mb-2 leading-snug">{discoverError}</p>
            ) : null}
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

        {/* ── Right Sidebar: Destination List (desktop only) ───── */}
        <motion.div
          className="hidden lg:flex h-full bg-[#FBF8F3]/95 backdrop-blur-lg border-l border-[#0B1F2A]/8 flex-col z-20 shadow-[0_18px_40px_-20px_rgba(11,31,42,0.18)]"
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
              {displayPlaces.length} {displayPlaces.length === 1 ? "place" : "places"} match your filters
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {displayPlaces.length === 0 ? (
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
              displayPlaces.map((dest) => {
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

        {/* ══════════════════════════════════════════════════════════════
            MOBILE UI — top bar + filters drawer + bottom destination sheet
            ════════════════════════════════════════════════════════════ */}

        {/* Mobile top bar — back · title · filter toggle */}
        <div className="lg:hidden absolute top-0 inset-x-0 z-30 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between bg-gradient-to-b from-white/90 via-white/70 to-transparent backdrop-blur-md">
          <button
            onClick={() => setFlowStep("budget")}
            className="p-2 rounded-full bg-white/95 shadow-sm border border-[#0B1F2A]/8"
            aria-label="Back"
          >
            <ArrowLeft size={16} className="text-[#0B1F2A]" />
          </button>
          <div className="text-center">
            <p className="text-[9px] tracking-[0.24em] text-[#2F6F73] font-semibold uppercase">
              Discover
            </p>
            <h2 className="font-serif text-[14px] font-semibold text-[#0B1F2A] leading-tight">
              {displayPlaces.length} {displayPlaces.length === 1 ? "place" : "places"}
            </h2>
          </div>
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="relative p-2 rounded-full bg-white/95 shadow-sm border border-[#0B1F2A]/8"
            aria-label="Filters"
          >
            <SlidersHorizontal size={16} className="text-[#0B1F2A]" />
            {(categories.length > 0 || tripType) && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D97757]" />
            )}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {!mobileListHidden ? (
            <motion.div
              key="mobile-destination-sheet"
              className="lg:hidden absolute inset-x-0 bottom-0 z-20 bg-[#FBF8F3] rounded-t-3xl border-t border-[#0B1F2A]/10 shadow-[0_-12px_40px_-12px_rgba(11,31,42,0.18)] overflow-hidden flex flex-col"
              initial={{ y: "100%" }}
              animate={{ y: 0, height: mobileListExpanded ? "78vh" : "38vh" }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 240, damping: 28 }}
            >
              {/* Sheet controls */}
              <div className="w-full pt-3 pb-2 flex flex-col items-center shrink-0">
                <button
                  onClick={() => setMobileListHidden(true)}
                  className="block w-10 h-1 rounded-full bg-[#0B1F2A]/15"
                  aria-label="Hide curated places"
                />
                <div className="mt-2 flex w-full items-center justify-between px-4">
                  <span className="text-[10px] tracking-[0.24em] text-[#2F6F73] font-semibold uppercase">
                    Curated for you
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setMobileListExpanded((v) => !v)}
                      className="rounded-full p-1.5 text-[#0B1F2A]/45 hover:bg-[#0B1F2A]/5"
                      aria-label={mobileListExpanded ? "Collapse list" : "Expand list"}
                    >
                      <ChevronUp
                        size={12}
                        className={`transition-transform ${mobileListExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                    <button
                      onClick={() => setMobileListHidden(true)}
                      className="rounded-full p-2 text-[#0B1F2A]/40 hover:bg-[#0B1F2A]/5 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label="Close curated places"
                    >
                      <Minus size={22} strokeWidth={2.5} className="opacity-70" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pb-4">
                {displayPlaces.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-[13px] font-medium text-[#0B1F2A]">No matches yet</p>
                    <p className="text-[11.5px] text-[#0B1F2A]/50 mt-1">
                      Try widening your budget or removing a category.
                    </p>
                  </div>
                ) : (
                  displayPlaces.map((dest) => {
                    const fit = getBudgetFit(dest, budget);
                    const color = getBudgetColor(fit);
                    return (
                      <button
                        key={`m-${dest.id}`}
                        onClick={() => setSelectedDest(dest)}
                        className="w-full text-left px-5 py-3 border-b border-[#0B1F2A]/5 active:bg-[#F5EFE6]/60 flex items-center gap-3"
                      >
                        <span
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-base shrink-0"
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
                          <p className="text-[11px] text-[#0B1F2A]/50 truncate">
                            {dest.state} · ₹{(dest.costMin / 1000).toFixed(0)}K–
                            {(dest.costMax / 1000).toFixed(0)}K · {dest.durationMin}–
                            {dest.durationMax}d
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-[#0B1F2A]/30 shrink-0" />
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="mobile-destination-sheet-reopen"
              initial={{ y: 22, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 22, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileListHidden(false)}
              className="lg:hidden absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-[#0B1F2A]/10 bg-[#FBF8F3]/95 px-4 py-2 shadow-[0_10px_26px_-14px_rgba(11,31,42,0.35)] backdrop-blur-sm"
              aria-label="Show curated places"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#2F6F73]">
                Show curated places
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Mobile filters drawer */}
        <AnimatePresence>
          {mobileFiltersOpen && (
            <>
              <motion.div
                className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileFiltersOpen(false)}
              />
              <motion.div
                className="lg:hidden fixed top-0 bottom-0 right-0 z-50 w-[85vw] max-w-[340px] bg-white shadow-2xl flex flex-col"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 280, damping: 30 }}
              >
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#0B1F2A]/8">
                  <div>
                    <p className="text-[10px] tracking-[0.24em] text-[#2F6F73] font-semibold uppercase">
                      Refine
                    </p>
                    <h2 className="font-serif text-[18px] font-semibold text-[#0B1F2A]">
                      Filters
                    </h2>
                  </div>
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="p-2 rounded-full hover:bg-[#F5EFE6]"
                    aria-label="Close"
                  >
                    <X size={18} className="text-[#0B1F2A]" />
                  </button>
                </div>

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
                        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#E89378] to-[#D97757] rounded-full"
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
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[#D97757] rounded-full shadow border-2 border-white pointer-events-none"
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
                              : "bg-white border-gray-200 text-gray-600"
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
                    <div className="grid grid-cols-2 gap-2">
                      {TRAVELER_TYPES.map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          onClick={() => setTripType(tripType === id ? "" : id)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                            tripType === id
                              ? "bg-[#D97757] border-[#D97757] text-white"
                              : "bg-white border-gray-200 text-gray-600"
                          }`}
                        >
                          <Icon size={14} />
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
                              : "bg-white border-gray-200 text-gray-600"
                          }`}
                        >
                          <span>{emoji}</span>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 text-xs text-gray-400"
                  >
                    <FilterX size={13} />
                    Clear Filters
                  </button>
                </div>

                <div className="px-5 py-4 border-t border-[#0B1F2A]/8 bg-[#FBF8F3]">
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="w-full py-3 rounded-xl text-white font-semibold text-sm"
                    style={{
                      background: "linear-gradient(135deg, #D97757, #B85F44)",
                    }}
                  >
                    Show {displayPlaces.length} {displayPlaces.length === 1 ? "place" : "places"}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
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
                        ? "Within budget"
                        : fit === "stretch"
                          ? "Stretch"
                          : "Over budget"}
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
                      planningMode === "manual"
                        ? "Build My Custom Itinerary →"
                        : "Build Itinerary →"
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
