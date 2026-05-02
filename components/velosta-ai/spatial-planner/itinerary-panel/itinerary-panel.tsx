"use client";
import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map, FileDown, RotateCcw, MapPin, Utensils, Camera, Bed,
  Sun, Sunset, Moon, Coffee, Navigation, Save, BedDouble, UtensilsCrossed,
  Send, Sparkles, ChevronDown, ChevronUp, Loader2, ArrowLeft, Share2, Settings,
  MessageCircle, Compass, X, ExternalLink,
} from "lucide-react";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { useMapStore } from "@/lib/stores/map-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useUser } from "@/app/utils/context";
import {
  geocodeDestination,
  enrichItineraryWithCoordinates,
  itineraryToMarkers,
} from "@/lib/services/geocoding";
import { generatePlannerStreamAsync } from "@/lib/services/planner-service";
import LocationCard from "./location-card";
import SuggestionsPanel from "./suggestions-panel";
import { exportItineraryPDF } from "@/lib/services/index";
import { mergeTripDataForExport } from "@/lib/utils/trip-party";
import type { ActivityRow, TripData } from "@/lib/types/planner.types";
import { createSharedTrip, saveTripSnapshot } from "@/lib/services/trips-service";
import { buildTravelProfilePrompt } from "@/lib/services/travel-profile-prompt";

// ── Google Maps navigation helper ────────────────────────────────────────
function buildGoogleMapsUrl(rows: ActivityRow[], destination: string): string {
  // Each stop is either "lat,lng" (when geocoded) or a plain-text search query.
  // Never pre-encode the plain-text variant — URL construction below handles encoding.
  const stops = rows.map((r) =>
    r.coordinates
      ? `${r.coordinates[1]},${r.coordinates[0]}` // Mapbox [lng,lat] → Google "lat,lng"
      : `${r.activity}, ${destination}`             // readable address, no pre-encoding
  );

  if (stops.length === 0)
    return `https://www.google.com/maps/search/${encodeURIComponent(destination)}`;
  if (stops.length === 1)
    return `https://www.google.com/maps/search/${encodeURIComponent(stops[0])}`;

  // Build the URL manually so that:
  //   • each param value is encoded exactly once
  //   • waypoint separators stay as %7C (Google Maps accepts both | and %7C)
  const enc = encodeURIComponent;
  const origin = enc(stops[0]);
  const dest   = enc(stops[stops.length - 1]);
  let   url    = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`;

  const midpoints = stops.slice(1, -1);
  if (midpoints.length > 0) {
    url += `&waypoints=${midpoints.map(enc).join("%7C")}`;
  }
  return url;
}

// ── Velosta Gilded Meridian palette ──────────────────────────────────────
// Amber → terracotta → teal → charcoal → muted gold → deep amber → moss → indigo-night.
// All hues sit on the warm/grounded side of the wheel so the panel reads as a
// single editorial composition rather than a rainbow of unrelated days.
const DAY_COLORS = [
  "#D97757", // amber (signature)
  "#2F6F73", // teal meridian
  "#B85F44", // burnt terracotta
  "#0B1F2A", // charcoal
  "#A88452", // muted gold
  "#7A4A36", // deep amber
  "#3A6A4E", // moss
  "#2A3A52", // indigo night
];

function getDayColor(i: number): string {
  return DAY_COLORS[i % DAY_COLORS.length];
}

/** Parse time like "9:00 AM", "2:30 PM" into hours (0-23) */
function parseHour(time: string): number {
  const match = time.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (!match) return -1;
  let h = parseInt(match[1], 10);
  const ampm = match[3]?.toLowerCase();
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  return h;
}

interface TimeSection {
  key: string;
  label: string;
  icon: React.ReactNode;
  rows: (ActivityRow & { stopNumber: number })[];
}

function groupByTimeOfDay(rows: ActivityRow[]): TimeSection[] {
  const morning: (ActivityRow & { stopNumber: number })[] = [];
  const afternoon: (ActivityRow & { stopNumber: number })[] = [];
  const evening: (ActivityRow & { stopNumber: number })[] = [];
  const night: (ActivityRow & { stopNumber: number })[] = [];

  rows.forEach((row, idx) => {
    const tagged = { ...row, stopNumber: idx + 1 };
    const hour = parseHour(row.time);
    if (hour >= 0 && hour < 12) morning.push(tagged);
    else if (hour >= 12 && hour < 17) afternoon.push(tagged);
    else if (hour >= 17 && hour < 21) evening.push(tagged);
    else if (hour >= 21) night.push(tagged);
    else morning.push(tagged); // fallback for unparseable
  });

  const sections: TimeSection[] = [];
  if (morning.length) sections.push({ key: "morning", label: "Morning", icon: <Coffee size={12} className="text-[#D97757]" strokeWidth={1.8} />, rows: morning });
  if (afternoon.length) sections.push({ key: "afternoon", label: "Afternoon", icon: <Sun size={12} className="text-[#B85F44]" strokeWidth={1.8} />, rows: afternoon });
  if (evening.length) sections.push({ key: "evening", label: "Evening", icon: <Sunset size={12} className="text-[#A88452]" strokeWidth={1.8} />, rows: evening });
  if (night.length) sections.push({ key: "night", label: "Night", icon: <Moon size={12} className="text-[#2F6F73]" strokeWidth={1.8} />, rows: night });

  // If no sections created (all fallback), put everything in one section
  if (sections.length === 0 && rows.length > 0) {
    sections.push({
      key: "all",
      label: "Activities",
      icon: <MapPin size={12} className="text-[#D97757]" strokeWidth={1.8} />,
      rows: rows.map((r, i) => ({ ...r, stopNumber: i + 1 })),
    });
  }
  return sections;
}

function looksLikeModificationRequest(input: string): boolean {
  const text = input.toLowerCase();
  const verbs = [
    "add",
    "remove",
    "delete",
    "replace",
    "swap",
    "move",
    "change",
    "update",
    "modify",
    "optimize",
    "rearrange",
    "reschedule",
    "include",
    "exclude",
  ];
  const targets = [
    "itinerary",
    "day",
    "days",
    "stop",
    "stops",
    "hotel",
    "restaurant",
    "activity",
    "place",
    "route",
    "budget",
  ];
  if (verbs.some((v) => text.includes(v)) && targets.some((t) => text.includes(t))) return true;
  // Catch destination-change style prompts like "how about Uttarakhand"
  if (/\b(how about|instead|rather|switch to|make it|plan for|change to)\b/.test(text)) return true;
  if (/\bday\s*\d+\b/.test(text)) return true;
  return false;
}

function hasMaterialItineraryChange(current: any, next: any): boolean {
  if (!current || !next) return false;
  const currDest = String(current.destination || "").trim().toLowerCase();
  const nextDest = String(next.destination || "").trim().toLowerCase();
  if (currDest && nextDest && currDest !== nextDest) return true;
  const currTable = JSON.stringify(current.itineraryTable || []);
  const nextTable = JSON.stringify(next.itineraryTable || []);
  return currTable !== nextTable;
}

export type ItineraryPanelVariant = "default" | "refineOnly";

interface ItineraryPanelProps {
  /** `refineOnly`: mobile full-screen streaming refine (same engine as desktop itinerary footer). */
  variant?: ItineraryPanelVariant;
  /** Strip extra header chrome when nested in map bottom sheet (`refineOnly` only). */
  mapOverlay?: boolean;
}

export default function ItineraryPanel({
  variant = "default",
  mapOverlay = false,
}: ItineraryPanelProps) {
  const {
    itinerary,
    itineraryData,
    tripData,
    activeDay,
    setActiveDay,
  } = usePlannerStore();
  const { accessToken } = useUser();
  const { activeMarkerId, setMarkers, flyTo } = useMapStore();

  // ── AI Chat state ──
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStreamText, setAiStreamText] = useState("");
  const streamAccRef = useRef("");
  const streamUiAccRef = useRef("");
  const streamUiRafRef = useRef<number | null>(null);
  // Toast for export/share actions
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [showStartNewConfirm, setShowStartNewConfirm] = useState(false);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const {
    setMobileTab,
    plannerRefineMessages: aiMessages,
    plannerRefineExpanded: aiExpanded,
    setPlannerRefineExpanded: setAiExpanded,
    setPlannerRefineMessages: setAiMessages,
    appendPlannerRefineMessage,
  } = useUIStore();
  const { selectedPackage, travelProfile, travelerCount: onboardingTravelerCount } =
    useOnboardingStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentDay = itinerary[activeDay];
  const dayColor = getDayColor(activeDay);

  const destination = useMemo(
    () => itineraryData?.destination || selectedPackage?.destination || "",
    [itineraryData, selectedPackage]
  );

  const tripDataForExport = useMemo(
    () => mergeTripDataForExport(tripData, onboardingTravelerCount),
    [tripData, onboardingTravelerCount]
  );

  const sections = useMemo(
    () => currentDay ? groupByTimeOfDay(currentDay.rows) : [],
    [currentDay]
  );

  useEffect(() => {
    return () => {
      if (streamUiRafRef.current != null) {
        cancelAnimationFrame(streamUiRafRef.current);
      }
    };
  }, []);

  // Scroll to active card when marker is clicked on map
  useEffect(() => {
    if (!activeMarkerId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-location-id="${CSS.escape(activeMarkerId)}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeMarkerId]);

  async function handleExportPDF() {
    if (!itineraryData || isExporting) return;
    setIsExporting(true);
    try {
      await exportItineraryPDF(itineraryData, tripDataForExport);
      setActionToast("Downloaded");
    } catch (err) {
      console.error("[itinerary] export pdf failed", err);
      setActionToast("Export failed");
    } finally {
      setIsExporting(false);
      setTimeout(() => setActionToast(null), 1800);
    }
  }

  function handleStartNew() {
    // Wipe planner + map + onboarding state, then return to landing.
    // Persisted localStorage keys are overwritten by these resets.
    try {
      usePlannerStore.getState().clearItinerary();
      useMapStore.getState().setMarkers([]);
      useMapStore.getState().flyTo([77.5946, 12.9716], 2, 0);
      useOnboardingStore.getState().reset();
    } catch (err) {
      console.warn("[itinerary] start-new reset failed", err);
    }
    setShowStartNewConfirm(false);
  }

  async function handleShare() {
    if (!itineraryData || isSharing || !accessToken) return;
    setIsSharing(true);
    try {
      const title =
        window.prompt("Name this shared trip", itineraryData.destination || "My Velosta trip")?.trim();
      if (!title) return;
      const payload = { itineraryData, tripData: tripDataForExport } as Record<string, unknown>;
      const data = await createSharedTrip(title, payload);
      const token = data.sharedTrip.shareToken;
      const url = `${window.location.origin}/saved-trips/shared/${token}`;
      if (navigator.share) {
        await navigator.share({
          title,
          text: "View this Velosta trip",
          url,
        });
        setActionToast("Link shared");
      } else {
        await navigator.clipboard.writeText(url);
        setActionToast("Share link copied");
      }
    } catch (err) {
      console.error("[itinerary] share failed", err);
      setActionToast("Share failed");
    } finally {
      setIsSharing(false);
      setTimeout(() => setActionToast(null), 1800);
    }
  }

  async function handleSaveTrip() {
    if (!itineraryData || isSavingTrip) return;
    setIsSavingTrip(true);
    try {
      const title =
        window.prompt("Save trip as", itineraryData.destination || "My Velosta trip")?.trim();
      if (!title) return;
      await saveTripSnapshot(title, {
        itineraryData,
        tripData: tripDataForExport,
      } as Record<string, unknown>);
      setActionToast("Trip saved");
    } catch (err) {
      console.error("[itinerary] save failed", err);
      setActionToast("Save failed");
    } finally {
      setIsSavingTrip(false);
      setTimeout(() => setActionToast(null), 1800);
    }
  }

  // ── AI Refine Handler (streaming) ──
  const submitAi = useCallback(
    async (text: string) => {
      if (!text || aiLoading || !itineraryData) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      setAiInput("");
      setAiLoading(true);
      setAiStreamText("");
      streamAccRef.current = "";
      streamUiAccRef.current = "";
      if (streamUiRafRef.current != null) {
        cancelAnimationFrame(streamUiRafRef.current);
        streamUiRafRef.current = null;
      }
      const userMsg = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      const nextHistory = [...aiMessages, userMsg];
      setAiMessages(nextHistory);
      const shouldModify = looksLikeModificationRequest(trimmed);

      try {
        const data = await generatePlannerStreamAsync(
          {
            userSaid: trimmed,
            conversationHistory: nextHistory.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            currentItinerary: itineraryData,
            isModificationRequest: shouldModify,
            desiredDays: Array.isArray(itineraryData.itineraryTable)
              ? itineraryData.itineraryTable.length
              : undefined,
            desiredBudget: (() => {
              const raw = tripData?.budget ?? itineraryData.totalBudget;
              if (!raw) return undefined;
              const n = Number(String(raw).replace(/[^0-9.]/g, ""));
              return Number.isFinite(n) && n > 0 ? n : undefined;
            })(),
            travelProfileContext: buildTravelProfilePrompt(travelProfile),
          },
          (token) => {
            streamAccRef.current += token;
            // Show tokens only when they look like natural-language text, not raw JSON
            if (!streamAccRef.current.trimStart().startsWith("{")) {
              streamUiAccRef.current = streamAccRef.current;
              if (streamUiRafRef.current == null) {
                streamUiRafRef.current = requestAnimationFrame(() => {
                  streamUiRafRef.current = null;
                  setAiStreamText(streamUiAccRef.current);
                });
              }
            }
          }
        );

        setAiStreamText("");

        if (data.isTextResponse) {
          appendPlannerRefineMessage({
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.message,
          });
        } else if (data.itineraryTable) {
          const materialChange = hasMaterialItineraryChange(itineraryData, data);
          if (!shouldModify && !materialChange) {
            appendPlannerRefineMessage({
              id: `a-${Date.now()}`,
              role: "assistant",
              content:
                data.summary ||
                "I can suggest options conversationally. Tell me explicitly what to change if you want me to edit the itinerary.",
            });
            return;
          }

          const prevTrip = usePlannerStore.getState().tripData;
          const extractedTripData: TripData = {
            ...prevTrip,
            destination: data.destination ?? prevTrip.destination,
            budget:
              data.totalEstimatedCost ||
              data.totalBudget ||
              prevTrip.budget,
          };
          usePlannerStore.getState().setItineraryData(data, extractedTripData);

          const destCoords = await geocodeDestination(data.destination);
          if (destCoords) flyTo(destCoords, 12, 0);

          const currentItin = usePlannerStore.getState().itinerary;
          const enriched = await enrichItineraryWithCoordinates(currentItin, data.destination);
          usePlannerStore.setState(() => ({
            itinerary: enriched,
            spentBudget: enriched.reduce((sum, d) => {
              const m = (d.dailyCost ?? "").replace(/[₹$€£,\s]/g, "").match(/[\d.]+/);
              return sum + (m ? parseFloat(m[0]) : 0);
            }, 0),
          }));
          setMarkers(itineraryToMarkers(enriched));

          const confirmation =
            data.modificationsApplied?.length > 0
              ? `Changes applied:\n${data.modificationsApplied
                  .map((m: string) => `• ${m}`)
                  .join("\n")}`
              : data.summary || "Done — I updated your itinerary and map.";
          appendPlannerRefineMessage({
            id: `a-${Date.now()}`,
            role: "assistant",
            content: confirmation,
          });
        }
      } catch (err: any) {
        setAiStreamText("");
        appendPlannerRefineMessage({
          id: `a-${Date.now()}`,
          role: "assistant",
          content:
            err.name === "AbortError"
              ? "Request timed out. Try again."
              : "Something went wrong. Please try again.",
        });
      } finally {
        if (streamUiRafRef.current != null) {
          cancelAnimationFrame(streamUiRafRef.current);
          streamUiRafRef.current = null;
        }
        setAiLoading(false);
      }
    },
    [aiLoading, itineraryData, flyTo, setMarkers, aiMessages, appendPlannerRefineMessage, setAiMessages, travelProfile]
  );

  const handleAiSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      submitAi(aiInput.trim());
    },
    [aiInput, submitAi]
  );

  // ── Mobile: full-screen refine (desktop parity — not legacy ChatWindow) ───
  if (variant === "refineOnly") {
    if (!itineraryData) {
      return (
        <div className="flex flex-col h-full min-h-0 items-center justify-center bg-[#FBF8F3] px-6 text-center">
          <p className="text-sm text-[#0B1F2A]/60">Open your itinerary to start refining.</p>
          <button
            type="button"
            onClick={() => setMobileTab("itinerary")}
            className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#B85F44]"
          >
            Go to itinerary →
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full min-h-0 bg-[#FBF8F3] relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 0%, rgba(217,119,87,0.08) 0%, transparent 55%), radial-gradient(100% 70% at 50% 100%, rgba(47,111,115,0.08) 0%, transparent 55%)",
          }}
        />

        {!mapOverlay && (
          <div className="relative shrink-0 px-4 pt-4 pb-3 border-b border-[#0B1F2A]/8">
            <button
              type="button"
              onClick={() => setMobileTab("itinerary")}
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0B1F2A]/55 hover:text-[#0B1F2A] transition-colors mb-3"
              aria-label="Back to itinerary"
            >
              <ArrowLeft size={12} strokeWidth={2} />
              <span>Itinerary</span>
            </button>
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.32em] text-[#2F6F73] mb-1">
              Ask Velosta
            </p>
            <h1 className="font-serif text-[22px] font-semibold text-[#0B1F2A] leading-tight truncate">
              {destination}
            </h1>
            <p className="text-[11px] text-[#0B1F2A]/50 mt-1.5">
              Streaming refine · updates your map when you change the plan
            </p>
          </div>
        )}

        <div className="relative flex-1 flex flex-col min-h-0">
          {(aiMessages.length > 0 || aiLoading) && (
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
              <div className="space-y-2 rounded-xl border border-[#D97757]/20 bg-[#F5EFE6]/45 px-3 py-3 min-h-[120px]">
                {aiMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`text-[12px] leading-relaxed whitespace-pre-line rounded-xl px-3 py-2.5 ${
                      m.role === "user"
                        ? "ml-6 bg-[#0B1F2A] text-white"
                        : "mr-6 bg-white text-[#0B1F2A]/85 border border-[#0B1F2A]/8"
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                {aiLoading && (
                  <div className="mr-6 rounded-xl border border-[#0B1F2A]/8 bg-white px-3 py-2.5 text-[12px] text-[#0B1F2A]/75">
                    {aiStreamText ? (
                      <>
                        {aiStreamText}
                        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-[#D97757] animate-pulse rounded-sm align-middle" />
                      </>
                    ) : (
                      <span className="flex items-center gap-1 text-[#0B1F2A]/40">
                        <span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span>
                        <span className="animate-bounce" style={{ animationDelay: "120ms" }}>●</span>
                        <span className="animate-bounce" style={{ animationDelay: "240ms" }}>●</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="relative shrink-0 border-t border-[#0B1F2A]/8 bg-[#FBF8F3] pb-[max(12px,env(safe-area-inset-bottom))]">
            {aiMessages.length === 0 && !aiLoading && (
              <p className="text-center text-[11px] text-[#0B1F2A]/45 px-4 pt-3 pb-1">
                Try a quick prompt below, or type your own change.
              </p>
            )}
            <div className="px-4 pt-2 pb-2 flex flex-wrap gap-2">
              {["Add a sunset viewpoint", "Swap restaurants", "Optimize my budget", "Suggest hidden gems"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submitAi(s)}
                  className="text-[11px] px-3 py-2 min-h-[44px] rounded-full border border-[#0B1F2A]/12 bg-white/80 text-[#0B1F2A]/70 hover:border-[#D97757] hover:text-[#B85F44] hover:bg-white transition-all"
                >
                  {s}
                </button>
              ))}
            </div>

            <form onSubmit={handleAiSubmit} className="px-4 pb-3 flex items-center gap-2">
              <input
                ref={aiInputRef}
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAiSubmit(e);
                  }
                }}
                placeholder={`e.g. Add a sunset viewpoint on Day ${(activeDay || 0) + 1}…`}
                className="flex-1 min-w-0 min-h-[48px] bg-white/90 border border-[#0B1F2A]/10 rounded-full px-4 py-3 text-[15px] text-[#0B1F2A] placeholder-[#0B1F2A]/35 outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/15 focus:bg-white transition-all"
                disabled={aiLoading}
                aria-label="Refine itinerary with Velosta"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiInput.trim()}
                className="shrink-0 w-12 h-12 min-w-[48px] min-h-[48px] rounded-full disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all active:scale-95 shadow-[0_4px_14px_-4px_rgba(217,119,87,0.55)]"
                style={{
                  background: "linear-gradient(135deg, #D97757 0%, #B85F44 100%)",
                }}
                aria-label="Send refine request"
              >
                {aiLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!itineraryData) {
    // Package preview
    if (selectedPackage) {
      const typeIcon = (type: string) => {
        switch (type) {
          case "food": return <Utensils size={12} className="text-orange-500" />;
          case "scenic": return <Camera size={12} className="text-emerald-500" />;
          case "stay": return <Bed size={12} className="text-indigo-500" />;
          default: return <MapPin size={12} className="text-[#D97757]" />;
        }
      };
      const typeBg = (type: string) => {
        switch (type) {
          case "food": return "bg-orange-50 border-orange-200";
          case "scenic": return "bg-emerald-50 border-emerald-200";
          case "stay": return "bg-indigo-50 border-indigo-200";
          default: return "bg-[#F5EFE6]/60 border-[#D97757]/30";
        }
      };

      return (
        <div className="flex flex-col h-full min-h-0 bg-[#FAFAFA]">
          <div className="px-4 pt-5 pb-3 border-b border-[#0B1F2A]/8 bg-[#FBF8F3] shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#2F6F73] mb-1.5">
              {selectedPackage.destination} · {selectedPackage.days} {selectedPackage.days === 1 ? "day" : "days"}
            </p>
            <h3 className="font-serif text-[15px] font-semibold text-[#0B1F2A]">{selectedPackage.name}</h3>
            <p className="text-[11.5px] text-[#0B1F2A]/55 mt-1">{selectedPackage.costLabel} estimated</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Planned Stops</p>
            {selectedPackage.itineraryPoints.map((pt, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.25 }}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${typeBg(pt.type)}`}
              >
                <span className="w-6 h-6 rounded-full bg-white border flex items-center justify-center shrink-0 text-[10px] font-bold text-gray-500">{idx + 1}</span>
                {typeIcon(pt.type)}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 truncate">{pt.name}</p>
                  <p className="text-[10px] text-gray-400 capitalize">{pt.type}</p>
                </div>
              </motion.div>
            ))}
            <div className="rounded-2xl p-3 bg-[#F5EFE6]/60 border border-[#D97757]/30 mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-1.5 text-[#B85F44]">Highlights</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedPackage.highlights.map((h, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#D97757]/30 text-[#B85F44]">{h}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="px-4 py-3 border-t border-[#0B1F2A]/8 bg-[#FBF8F3] shrink-0">
            <button
              onClick={() => setMobileTab("chat")}
              className="w-full text-xs px-5 py-2.5 rounded-full font-medium transition-all text-white shadow-sm hover:shadow-md active:scale-95"
              style={{ background: "linear-gradient(135deg, #D97757, #B85F44)" }}
            >
              Chat with AI to refine →
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full bg-[#FBF8F3] relative overflow-hidden">
        {/* Editorial backdrop wash */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 0%, rgba(217,119,87,0.08) 0%, transparent 55%), radial-gradient(100% 70% at 50% 100%, rgba(47,111,115,0.08) 0%, transparent 55%)",
          }}
        />

        <div className="relative flex-1 flex flex-col items-center justify-center px-8 text-center">
          {/* Eyebrow */}
          <p className="text-[10px] font-semibold tracking-[0.32em] text-[#2F6F73] uppercase mb-6">
            Step 03 · Itinerary
          </p>

          {/* Illustrative composition */}
          <div className="relative mb-7">
            <motion.div
              className="relative w-[140px] h-[140px] rounded-full flex items-center justify-center"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, rgba(217,119,87,0.18), rgba(47,111,115,0.10) 60%, transparent)",
                border: "1px solid rgba(11,31,42,0.08)",
              }}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Map size={36} className="text-[#0B1F2A]" strokeWidth={1.4} />
              {/* Orbiting dot */}
              <motion.span
                className="absolute w-2.5 h-2.5 rounded-full bg-[#D97757] shadow-[0_0_12px_rgba(217,119,87,0.6)]"
                style={{ top: "6%", left: "50%", marginLeft: -5 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
            <span
              className="absolute -bottom-1 -right-2 w-3 h-3 rounded-full bg-[#3A8589]"
              style={{ boxShadow: "0 0 0 4px rgba(58,133,137,0.15)" }}
            />
          </div>

          {/* Headline */}
          <h2 className="font-serif text-[22px] leading-[1.2] text-[#0B1F2A] max-w-[260px]">
            Your <span className="italic text-[#D97757]">day-by-day</span> story will live here
          </h2>
          <p className="text-[12.5px] leading-relaxed text-[#0B1F2A]/55 mt-3 max-w-[240px]">
            Tell Velosta what you'd love — a sunrise hike, a quiet bookshop, a long lunch — and we'll thread it into a plan.
          </p>

          {/* CTA */}
          <motion.button
            onClick={() => setMobileTab("chat")}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-[13px] font-semibold"
            style={{
              background: "linear-gradient(135deg, #D97757, #B85F44)",
              boxShadow: "0 14px 38px -10px rgba(217,119,87,0.55)",
            }}
          >
            <MessageCircle size={14} strokeWidth={2.2} />
            Start chatting with Velosta
          </motion.button>

          <p className="text-[10.5px] text-[#0B1F2A]/40 mt-4 tracking-wide">
            Takes ~ 60 seconds · Refine anytime
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#FBF8F3]">
      {/* ── Top utility bar (extra top padding on desktop to clear FlowChrome brand mark) ── */}
      <div className="shrink-0 pt-3 md:pt-[68px] px-5 pb-2 flex items-center justify-between">
        <button
          onClick={() => useOnboardingStore.getState().setFlowStep("explore")}
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0B1F2A]/55 hover:text-[#0B1F2A] transition-colors"
          aria-label="Back to explore"
        >
          <ArrowLeft size={12} strokeWidth={2} />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowStartNewConfirm(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#D97757]/40 bg-gradient-to-r from-[#D97757]/8 to-[#B85F44]/8 hover:from-[#D97757]/15 hover:to-[#B85F44]/15 transition-all text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B85F44] mr-1"
            title="Begin a fresh journey"
            aria-label="Start a new journey"
          >
            <Compass size={11} strokeWidth={2.2} />
            <span>New&nbsp;Journey</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting || !itineraryData}
            className="p-1.5 rounded-md hover:bg-[#0B1F2A]/5 transition-colors text-[#0B1F2A]/45 hover:text-[#0B1F2A]/85 disabled:opacity-40"
            title="Download PDF"
            aria-label="Download PDF"
          >
            {isExporting ? (
              <Loader2 size={13} strokeWidth={1.8} className="animate-spin" />
            ) : (
              <FileDown size={13} strokeWidth={1.8} />
            )}
          </button>
          <button
            onClick={handleSaveTrip}
            disabled={isSavingTrip || !itineraryData || !accessToken}
            className="p-1.5 rounded-md hover:bg-[#0B1F2A]/5 transition-colors text-[#0B1F2A]/45 hover:text-[#0B1F2A]/85 disabled:opacity-40"
            title="Save trip"
            aria-label="Save trip"
          >
            {isSavingTrip ? (
              <Loader2 size={13} strokeWidth={1.8} className="animate-spin" />
            ) : (
              <Save size={13} strokeWidth={1.8} />
            )}
          </button>
          <button
            onClick={handleShare}
            disabled={isSharing || !itineraryData || !accessToken}
            className="p-1.5 rounded-md hover:bg-[#0B1F2A]/5 transition-colors text-[#0B1F2A]/45 hover:text-[#0B1F2A]/85 disabled:opacity-40"
            title="Share itinerary"
            aria-label="Share itinerary"
          >
            {isSharing ? (
              <Loader2 size={13} strokeWidth={1.8} className="animate-spin" />
            ) : (
              <Share2 size={13} strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>

      {/* ── Editorial Header ────────────────────────────────── */}
      <div className="shrink-0 px-5 pb-4 relative">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.32em] text-[#2F6F73] mb-1.5">
          Itinerary
          {itinerary.length > 0 && (
            <span className="text-[#0B1F2A]/30 mx-1.5">·</span>
          )}
          {itinerary.length > 0 && (
            <span className="text-[#0B1F2A]/45 tracking-[0.22em]">
              {itinerary.length} {itinerary.length === 1 ? "day" : "days"}
            </span>
          )}
        </p>
        <h1 className="font-serif text-[26px] font-semibold text-[#0B1F2A] leading-[1.05] tracking-tight truncate">
          {destination}
        </h1>
        {tripData?.travelType && (
          <p className="text-[11px] text-[#0B1F2A]/50 mt-2 tracking-wide capitalize">
            {tripData.travelType.replace(/-/g, " ")}
            {tripData?.totalCost && (
              <>
                <span className="text-[#0B1F2A]/25 mx-2">·</span>
                <span className="tabular-nums text-[#0B1F2A]/65 font-medium">{tripData.totalCost}</span>
              </>
            )}
          </p>
        )}
        {/* gilded meridian hairline */}
        <span
          aria-hidden
          className="absolute left-5 right-5 bottom-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, rgba(217,119,87,0.45) 0%, rgba(217,119,87,0.12) 35%, transparent 100%)",
          }}
        />
      </div>

      {/* ── Day Tabs ──────────────────────────────────────────── */}
      <div className="shrink-0 bg-[#FBF8F3] relative">
        <div className="flex items-center gap-1.5 px-5 pt-3 pb-3 overflow-x-auto scrollbar-none">
          {itinerary.map((day, i) => {
            const color = getDayColor(i);
            const isActive = i === activeDay;
            return (
              <button
                key={day.id}
                onClick={() => setActiveDay(i)}
                className={`relative flex items-baseline gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#0B1F2A] text-[#FBF8F3] shadow-[0_4px_14px_-6px_rgba(11,31,42,0.45)]"
                    : "text-[#0B1F2A]/55 hover:bg-[#0B1F2A]/[0.04] hover:text-[#0B1F2A]/85"
                }`}
              >
                <span className="text-[11px] font-semibold tracking-[0.04em]">
                  Day {day.day}
                </span>
                {day.dailyCost && (
                  <span
                    className={`text-[9.5px] tabular-nums tracking-wide ${
                      isActive ? "text-[#FBF8F3]/60" : "text-[#0B1F2A]/35"
                    }`}
                  >
                    {day.dailyCost}
                  </span>
                )}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full"
                    style={{
                      background: color,
                      boxShadow: `0 0 8px ${color}aa`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
        {/* divider hairline */}
        <span
          aria-hidden
          className="absolute left-5 right-5 bottom-0 h-px bg-[#0B1F2A]/8"
        />
      </div>

      {/* ── Day Theme line ────────────────────────────────────── */}
      {currentDay && (currentDay.theme || currentDay.rows.length > 0) && (
        <div className="shrink-0 px-5 pt-4 pb-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-[15px] font-medium text-[#0B1F2A]/85 leading-snug truncate min-w-0 flex-1">
              {currentDay.theme || `Chapter ${currentDay.day}`}
            </h2>
            <span
              className="shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.22em] tabular-nums"
              style={{ color: dayColor }}
            >
              {currentDay.rows.length} {currentDay.rows.length === 1 ? "Stop" : "Stops"}
            </span>
            {currentDay.rows.length > 0 && (
              <a
                href={buildGoogleMapsUrl(currentDay.rows, itineraryData?.destination ?? "")}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[9.5px] font-semibold transition-all hover:opacity-75 active:scale-95"
                style={{
                  background: "rgba(66,133,244,0.10)",
                  color: "#4285F4",
                  border: "1px solid rgba(66,133,244,0.22)",
                }}
                title="Navigate all stops in Google Maps"
              >
                <ExternalLink size={9} strokeWidth={2.2} />
                Maps
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Scrollable content with time-of-day sections ───── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0 bg-[#FBF8F3]"
        style={{ scrollbarColor: "rgba(11,31,42,0.12) transparent" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDay}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {sections.map((section) => (
              <div key={section.key}>
                {/* Section header — editorial eyebrow */}
                <div className="flex items-center gap-2 px-2 mb-2.5">
                  <span className="opacity-60">{section.icon}</span>
                  <span className="text-[9.5px] font-semibold text-[#0B1F2A]/55 uppercase tracking-[0.28em]">
                    {section.label}
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(11,31,42,0.10) 0%, transparent 100%)",
                    }}
                  />
                </div>

                {/* Location cards */}
                <div className="space-y-1.5">
                  {section.rows.map((row) => (
                    <LocationCard
                      key={row.id}
                      row={row}
                      dayIndex={activeDay}
                      stopNumber={row.stopNumber}
                      dayColor={dayColor}
                      destination={destination}
                      isActive={row.id === activeMarkerId}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Meals */}
            {currentDay?.meals && Object.values(currentDay.meals).some(Boolean) && (
              <div className="mx-1 mt-2 p-3.5 rounded-xl bg-white/70 border border-[#0B1F2A]/8 shadow-[0_2px_8px_-4px_rgba(11,31,42,0.06)]">
                <div className="flex items-center gap-1.5 mb-2">
                  <UtensilsCrossed size={11} className="text-[#D97757]" strokeWidth={1.8} />
                  <span className="text-[10px] font-semibold text-[#0B1F2A]/55 uppercase tracking-[0.22em]">
                    Meals
                  </span>
                </div>
                <div className="space-y-1">
                  {currentDay.meals.breakfast && (
                    <p className="text-[11.5px] text-[#0B1F2A]/75 leading-snug">
                      <span className="text-[#D97757] font-semibold tracking-wide uppercase text-[9.5px] mr-1">Breakfast</span>
                      {currentDay.meals.breakfast}
                    </p>
                  )}
                  {currentDay.meals.lunch && (
                    <p className="text-[11.5px] text-[#0B1F2A]/75 leading-snug">
                      <span className="text-[#D97757] font-semibold tracking-wide uppercase text-[9.5px] mr-1">Lunch</span>
                      {currentDay.meals.lunch}
                    </p>
                  )}
                  {currentDay.meals.dinner && (
                    <p className="text-[11.5px] text-[#0B1F2A]/75 leading-snug">
                      <span className="text-[#D97757] font-semibold tracking-wide uppercase text-[9.5px] mr-1">Dinner</span>
                      {currentDay.meals.dinner}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Accommodation */}
            {currentDay?.accommodation && (
              <div className="mx-1 p-3.5 rounded-xl bg-white/70 border border-[#0B1F2A]/8 flex items-start gap-2 shadow-[0_2px_8px_-4px_rgba(11,31,42,0.06)]">
                <BedDouble size={12} className="text-[#2F6F73] mt-0.5 shrink-0" strokeWidth={1.8} />
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-[#0B1F2A]/55 uppercase tracking-[0.22em]">Stay</span>
                  <p className="text-[11.5px] text-[#0B1F2A]/75 mt-0.5 leading-snug">{currentDay.accommodation}</p>
                </div>
              </div>
            )}

            {/* AI Suggestions */}
            <SuggestionsPanel />

            {/* Local tips */}
            {itineraryData.localTips && itineraryData.localTips.length > 0 && (
              <div className="mx-1 rounded-xl p-3.5 bg-[#F5EFE6]/70 border border-[#D97757]/20">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-2 text-[#B85F44]">
                  Local Tips
                </p>
                <ul className="space-y-1.5">
                  {itineraryData.localTips.map((tip, i) => (
                    <li key={i} className="text-[11.5px] flex items-start gap-2 leading-relaxed text-[#0B1F2A]/75">
                      <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-[#D97757]" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="h-4" />
      </div>

      {/* ── AI Refine Input ─────────────────────────────────── */}
      <div className="shrink-0 border-t border-[#0B1F2A]/8 bg-[#FBF8F3]">
        <button
          onClick={() => {
            const nextExpanded = !aiExpanded;
            setAiExpanded(nextExpanded);
            if (!aiExpanded) setTimeout(() => aiInputRef.current?.focus(), 100);
          }}
          aria-expanded={aiExpanded}
          aria-label={aiExpanded ? "Collapse refine panel" : "Expand refine panel"}
          className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-semibold tracking-wide text-[#0B1F2A]/70 hover:bg-[#0B1F2A]/[0.03] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Sparkles size={12} className="text-[#D97757]" strokeWidth={1.8} />
            <span className="uppercase tracking-[0.18em]">Ask Velosta to refine</span>
          </span>
          {aiExpanded ? <ChevronUp size={13} className="text-[#0B1F2A]/40" /> : <ChevronDown size={13} className="text-[#0B1F2A]/40" />}
        </button>

        <AnimatePresence>
          {aiExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {(aiMessages.length > 0 || aiLoading) && (
                <div className="px-4 pb-2">
                  <div className="max-h-44 overflow-y-auto space-y-2 rounded-lg border border-[#D97757]/20 bg-[#F5EFE6]/45 px-2.5 py-2">
                    {aiMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`text-[11px] leading-relaxed whitespace-pre-line rounded-lg px-3 py-2 ${
                          m.role === "user"
                            ? "ml-8 bg-[#0B1F2A]/90 text-white"
                            : "mr-8 bg-white text-[#0B1F2A]/80 border border-[#0B1F2A]/8"
                        }`}
                      >
                        {m.content}
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="mr-8 rounded-lg border border-[#0B1F2A]/8 bg-white px-3 py-2 text-[11px] text-[#0B1F2A]/70">
                        {aiStreamText ? (
                          <>
                            {aiStreamText}
                            <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-[#D97757] animate-pulse rounded-sm align-middle" />
                          </>
                        ) : (
                          <span className="flex items-center gap-1 text-[#0B1F2A]/40">
                            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span>
                            <span className="animate-bounce" style={{ animationDelay: "120ms" }}>●</span>
                            <span className="animate-bounce" style={{ animationDelay: "240ms" }}>●</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {["Add a sunset viewpoint", "Swap restaurants", "Optimize my budget", "Suggest hidden gems"].map((s) => (
                  <button
                    key={s}
                    onClick={() => submitAi(s)}
                    className="text-[10px] px-2.5 py-1 rounded-full border border-[#0B1F2A]/12 bg-white/60 text-[#0B1F2A]/65 hover:border-[#D97757] hover:text-[#B85F44] hover:bg-white transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <form
                onSubmit={handleAiSubmit}
                className="px-4 flex items-center gap-2 pb-[max(12px,calc(0.5rem+env(safe-area-inset-bottom,0px)))] md:pb-3"
              >
                <input
                  ref={aiInputRef}
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAiSubmit(e);
                    }
                  }}
                  placeholder={`e.g. Add a sunset viewpoint on Day ${(activeDay || 0) + 1}…`}
                  className="flex-1 min-w-0 min-h-[44px] md:min-h-0 bg-white/80 border border-[#0B1F2A]/10 rounded-full px-3.5 py-2.5 md:py-2 text-[15px] md:text-[11.5px] text-[#0B1F2A] placeholder-[#0B1F2A]/35 outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/15 focus:bg-white transition-all"
                  disabled={aiLoading}
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiInput.trim()}
                  className="shrink-0 w-12 h-12 md:w-8 md:h-8 min-w-[48px] min-h-[48px] md:min-w-0 md:min-h-0 rounded-full disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all active:scale-95 shadow-[0_4px_10px_-3px_rgba(217,119,87,0.55)]"
                  style={{
                    background:
                      "linear-gradient(135deg, #D97757 0%, #B85F44 100%)",
                  }}
                  aria-label="Send refine request"
                >
                  {aiLoading ? (
                    <Loader2 className="w-[18px] h-[18px] md:w-[13px] md:h-[13px] animate-spin" strokeWidth={2} />
                  ) : (
                    <Send className="w-[18px] h-[18px] md:w-[13px] md:h-[13px]" strokeWidth={2} />
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action toast — small, centered, auto-dismisses */}
      <AnimatePresence>
        {actionToast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-[12px] font-medium text-white shadow-lg pointer-events-none"
            style={{ background: "rgba(11,31,42,0.92)", backdropFilter: "blur(8px)" }}
            role="status"
            aria-live="polite"
          >
            {actionToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Start New Journey · confirm dialog ───────────────────────── */}
      <AnimatePresence>
        {showStartNewConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-5"
            style={{ background: "rgba(11,31,42,0.55)", backdropFilter: "blur(6px)" }}
            onClick={() => setShowStartNewConfirm(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-new-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              className="relative w-full max-w-[420px] rounded-3xl bg-[#FBF8F3] border border-[#0B1F2A]/8 shadow-[0_30px_80px_-20px_rgba(11,31,42,0.55)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Editorial wash */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(120% 80% at 50% 0%, rgba(217,119,87,0.14) 0%, transparent 55%), radial-gradient(100% 70% at 50% 100%, rgba(47,111,115,0.10) 0%, transparent 55%)",
                }}
              />

              <button
                onClick={() => setShowStartNewConfirm(false)}
                className="absolute top-3 right-3 p-1.5 rounded-full text-[#0B1F2A]/45 hover:text-[#0B1F2A] hover:bg-[#0B1F2A]/5 transition-colors"
                aria-label="Close"
              >
                <X size={14} strokeWidth={2} />
              </button>

              <div className="relative px-7 pt-9 pb-7 text-center">
                {/* Compass mark */}
                <div className="mx-auto mb-5 w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, rgba(217,119,87,0.22), rgba(47,111,115,0.10) 65%, transparent)",
                    border: "1px solid rgba(11,31,42,0.08)",
                  }}
                >
                  <Compass size={26} className="text-[#B85F44]" strokeWidth={1.6} />
                </div>

                <p className="text-[9.5px] font-semibold uppercase tracking-[0.32em] text-[#2F6F73] mb-2">
                  A new horizon
                </p>
                <h2 id="start-new-title" className="font-serif text-[22px] leading-[1.18] text-[#0B1F2A]">
                  Begin a <span className="italic text-[#D97757]">fresh</span> journey?
                </h2>
                <p className="text-[12.5px] leading-relaxed text-[#0B1F2A]/55 mt-3 max-w-[320px] mx-auto">
                  Your current itinerary &mdash; <span className="font-medium text-[#0B1F2A]/75">{destination || "this trip"}</span> &mdash; will fold away. Don't worry, you can always plan another. The next chapter is waiting to be written.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
                  <button
                    onClick={() => setShowStartNewConfirm(false)}
                    className="px-5 py-2.5 rounded-full text-[12px] font-semibold text-[#0B1F2A]/70 hover:text-[#0B1F2A] bg-white border border-[#0B1F2A]/12 hover:bg-[#0B1F2A]/3 transition-all"
                  >
                    Keep this trip
                  </button>
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartNew}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-semibold text-white"
                    style={{
                      background: "linear-gradient(135deg, #D97757, #B85F44)",
                      boxShadow: "0 12px 30px -10px rgba(217,119,87,0.55)",
                    }}
                  >
                    <Sparkles size={13} strokeWidth={2.2} />
                    Start anew
                  </motion.button>
                </div>

                <p className="text-[10px] text-[#0B1F2A]/35 mt-5 tracking-wide italic">
                  &ldquo;Every journey begins with a single, deliberate step.&rdquo;
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

