"use client";
import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map, FileDown, RotateCcw, MapPin, Utensils, Camera, Bed,
  Sun, Sunset, Moon, Coffee, Navigation, Copy, BedDouble, UtensilsCrossed,
  Send, Sparkles, ChevronDown, ChevronUp, Loader2, ArrowLeft, Share2, Settings,
  MessageCircle,
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
import { generatePlannerResponse } from "@/lib/services/planner-service";
import LocationCard from "./location-card";
import SuggestionsPanel from "./suggestions-panel";
import { exportItineraryPDF } from "@/lib/services/index";
import type { ActivityRow } from "@/lib/types/planner.types";

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

export default function ItineraryPanel() {
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
  const [aiExpanded, setAiExpanded] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);  const { setMobileTab } = useUIStore();
  const { selectedPackage } = useOnboardingStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentDay = itinerary[activeDay];
  const dayColor = getDayColor(activeDay);

  const destination = useMemo(
    () => itineraryData?.destination || selectedPackage?.destination || "",
    [itineraryData, selectedPackage]
  );

  const sections = useMemo(
    () => currentDay ? groupByTimeOfDay(currentDay.rows) : [],
    [currentDay]
  );

  // Scroll to active card when marker is clicked on map
  useEffect(() => {
    if (!activeMarkerId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-location-id="${CSS.escape(activeMarkerId)}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeMarkerId]);

  async function handleExportPDF() {
    if (!itineraryData) return;
    await exportItineraryPDF(itineraryData, tripData);
  }

  function handleCopyItinerary() {
    if (!currentDay) return;
    const text = currentDay.rows
      .map((r, i) => `${i + 1}. ${r.time ? `[${r.time}] ` : ""}${r.activity}${r.description ? ` — ${r.description}` : ""}`)
      .join("\n");
    navigator.clipboard.writeText(`Day ${currentDay.day}: ${currentDay.theme}\n\n${text}`);
  }

  // ── AI Refine Handler ──
  const handleAiSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = aiInput.trim();
      if (!text || aiLoading || !itineraryData) return;

      setAiInput("");
      setAiLoading(true);
      setAiMessage(null);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      try {
        const data = await generatePlannerResponse({
          userSaid: text,
          conversationHistory: [
            { role: "assistant", content: `[Current itinerary for ${itineraryData.destination}]` },
            { role: "user", content: text },
          ],
          currentItinerary: itineraryData,
          isModificationRequest: true,
        });
        clearTimeout(timeout);

        if (data.isTextResponse) {
          setAiMessage(data.message);
        } else if (data.itineraryTable) {
          // Sync updated itinerary
          const extractedTripData = {
            destination: data.destination,
            budget: data.totalEstimatedCost || data.totalBudget,
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

          setAiMessage(data.summary || "Itinerary updated!");
          if (data.modificationsApplied?.length > 0) {
            setAiMessage(
              `Changes applied:\n${data.modificationsApplied.map((m: string) => `• ${m}`).join("\n")}`
            );
          }
        }
      } catch (err: any) {
        setAiMessage(
          err.name === "AbortError"
            ? "Request timed out. Try again."
            : "Something went wrong. Please try again."
        );
      } finally {
        setAiLoading(false);
      }
    },
    [aiInput, aiLoading, itineraryData, accessToken, flyTo, setMarkers]
  );

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
      {/* ── Top utility bar (sits below FlowChrome brand mark zone) ── */}
      <div className="shrink-0 pt-[68px] px-5 pb-2 flex items-center justify-between">
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
            onClick={handleExportPDF}
            className="p-1.5 rounded-md hover:bg-[#0B1F2A]/5 transition-colors text-[#0B1F2A]/45 hover:text-[#0B1F2A]/85"
            title="Export PDF"
          >
            <FileDown size={13} strokeWidth={1.8} />
          </button>
          <button
            onClick={handleCopyItinerary}
            className="p-1.5 rounded-md hover:bg-[#0B1F2A]/5 transition-colors text-[#0B1F2A]/45 hover:text-[#0B1F2A]/85"
            title="Share"
          >
            <Share2 size={13} strokeWidth={1.8} />
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
            setAiExpanded((v) => !v);
            if (!aiExpanded) setTimeout(() => aiInputRef.current?.focus(), 100);
          }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-semibold tracking-wide text-[#0B1F2A]/70 hover:bg-[#0B1F2A]/[0.03] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Sparkles size={12} className="text-[#D97757]" strokeWidth={1.8} />
            <span className="uppercase tracking-[0.18em]">Ask Velosta to refine</span>
          </span>
          {aiExpanded ? <ChevronDown size={13} className="text-[#0B1F2A]/40" /> : <ChevronUp size={13} className="text-[#0B1F2A]/40" />}
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
              {aiMessage && (
                <div className="px-4 pb-2">
                  <div className="text-[11px] text-[#0B1F2A]/75 bg-[#F5EFE6]/70 border border-[#D97757]/20 rounded-lg px-3 py-2 whitespace-pre-line leading-relaxed">
                    {aiMessage}
                  </div>
                </div>
              )}

              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {["Add a sunset viewpoint", "Swap restaurants", "Optimize my budget", "Suggest hidden gems"].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setAiInput(s);
                      aiInputRef.current?.focus();
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-full border border-[#0B1F2A]/12 bg-white/60 text-[#0B1F2A]/65 hover:border-[#D97757] hover:text-[#B85F44] hover:bg-white transition-all"
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
                  className="flex-1 min-w-0 bg-white/80 border border-[#0B1F2A]/10 rounded-full px-3.5 py-2 text-[11.5px] text-[#0B1F2A] placeholder-[#0B1F2A]/35 outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/15 focus:bg-white transition-all"
                  disabled={aiLoading}
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiInput.trim()}
                  className="shrink-0 w-8 h-8 rounded-full disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all active:scale-95 shadow-[0_4px_10px_-3px_rgba(217,119,87,0.55)]"
                  style={{
                    background:
                      "linear-gradient(135deg, #D97757 0%, #B85F44 100%)",
                  }}
                >
                  {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

