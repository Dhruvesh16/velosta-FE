"use client";
import { useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map, FileDown, RotateCcw, MapPin, Utensils, Camera, Bed,
  Sun, Sunset, Moon, Coffee, Navigation, Copy, BedDouble, UtensilsCrossed,
} from "lucide-react";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { useMapStore } from "@/lib/stores/map-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import LocationCard from "./location-card";
import SuggestionsPanel from "./suggestions-panel";
import { exportItineraryPDF } from "@/lib/services/index";
import type { ActivityRow } from "@/lib/types/planner.types";

const DAY_COLORS = [
  "#3B82F6", "#8B5CF6", "#06B6D4", "#22C55E",
  "#F59E0B", "#EF4444", "#EC4899", "#0891B2",
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
  if (morning.length) sections.push({ key: "morning", label: "Morning", icon: <Coffee size={13} className="text-amber-500" />, rows: morning });
  if (afternoon.length) sections.push({ key: "afternoon", label: "Afternoon", icon: <Sun size={13} className="text-orange-500" />, rows: afternoon });
  if (evening.length) sections.push({ key: "evening", label: "Evening", icon: <Sunset size={13} className="text-rose-500" />, rows: evening });
  if (night.length) sections.push({ key: "night", label: "Night", icon: <Moon size={13} className="text-indigo-400" />, rows: night });

  // If no sections created (all fallback), put everything in one section
  if (sections.length === 0 && rows.length > 0) {
    sections.push({
      key: "all",
      label: "Activities",
      icon: <MapPin size={13} className="text-amber-500" />,
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
  const { activeMarkerId } = useMapStore();
  const { setMobileTab } = useUIStore();
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

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!itineraryData) {
    // Package preview
    if (selectedPackage) {
      const typeIcon = (type: string) => {
        switch (type) {
          case "food": return <Utensils size={12} className="text-orange-500" />;
          case "scenic": return <Camera size={12} className="text-emerald-500" />;
          case "stay": return <Bed size={12} className="text-indigo-500" />;
          default: return <MapPin size={12} className="text-amber-500" />;
        }
      };
      const typeBg = (type: string) => {
        switch (type) {
          case "food": return "bg-orange-50 border-orange-200";
          case "scenic": return "bg-emerald-50 border-emerald-200";
          case "stay": return "bg-indigo-50 border-indigo-200";
          default: return "bg-amber-50 border-amber-200";
        }
      };

      return (
        <div className="flex flex-col h-full min-h-0 bg-[#FAFAFA]">
          <div className="px-4 pt-5 pb-3 border-b border-gray-100 bg-white shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 mb-1">
              {selectedPackage.destination} · {selectedPackage.days} {selectedPackage.days === 1 ? "day" : "days"}
            </p>
            <h3 className="text-sm font-bold text-gray-800">{selectedPackage.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{selectedPackage.costLabel} estimated</p>
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
            <div className="rounded-2xl p-3 bg-amber-50 border border-amber-200 mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-amber-600">Highlights</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedPackage.highlights.map((h, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-amber-200 text-amber-700">{h}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
            <button
              onClick={() => setMobileTab("chat")}
              className="w-full text-xs px-5 py-2.5 rounded-full font-medium transition-all bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm hover:shadow-md active:scale-95"
            >
              Chat with AI to refine →
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center bg-[#FAFAFA]">
        <motion.div
          className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Map size={24} className="text-gray-400" />
        </motion.div>
        <div>
          <p className="text-gray-800 text-sm font-semibold mb-1">Your itinerary will appear here</p>
          <p className="text-xs leading-relaxed text-gray-400 max-w-[220px] mx-auto">Chat with Velosta AI to generate a day-by-day travel plan</p>
        </div>
        <button
          onClick={() => setMobileTab("chat")}
          className="text-xs px-5 py-2.5 rounded-full font-medium transition-all bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm hover:shadow-md active:scale-95"
        >
          Start Chatting →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#FAFAFA]">
      {/* ── Day Tabs ──────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto scrollbar-none">
          {itinerary.map((day, i) => {
            const color = getDayColor(i);
            const isActive = i === activeDay;
            return (
              <button
                key={day.id}
                onClick={() => setActiveDay(i)}
                className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                Day {day.day}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Day Header ────────────────────────────────────────── */}
      {currentDay && (
        <div className="shrink-0 px-4 pt-4 pb-3 bg-white border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-gray-900 leading-snug">
                {currentDay.theme || `Day ${currentDay.day}`}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {currentDay.dailyCost && (
                  <span
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: `${dayColor}15`, color: dayColor }}
                  >
                    {currentDay.dailyCost}
                  </span>
                )}
                <span className="text-[11px] text-gray-400">
                  {currentDay.rows.length} {currentDay.rows.length === 1 ? "stop" : "stops"}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
            >
              <FileDown size={12} />
              Export PDF
            </button>
            <button
              onClick={handleCopyItinerary}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
            >
              <Copy size={12} />
              Copy
            </button>
            <button
              onClick={() => setMobileTab("chat")}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all bg-gray-900 text-white hover:bg-gray-800"
            >
              <RotateCcw size={12} />
              Modify
            </button>
          </div>
        </div>
      )}

      {/* ── Scrollable content with time-of-day sections ───── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0"
        style={{ scrollbarColor: "rgba(0,0,0,0.08) transparent" }}
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
                {/* Section header */}
                <div className="flex items-center gap-2 px-2 mb-2">
                  {section.icon}
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    {section.label}
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
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
              <div className="mx-1 mt-2 p-3.5 rounded-xl bg-white border border-gray-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <UtensilsCrossed size={12} className="text-orange-500" />
                  <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Meals</span>
                </div>
                <div className="space-y-1.5">
                  {currentDay.meals.breakfast && (
                    <p className="text-xs text-gray-600"><span className="text-orange-500 font-medium">Breakfast · </span>{currentDay.meals.breakfast}</p>
                  )}
                  {currentDay.meals.lunch && (
                    <p className="text-xs text-gray-600"><span className="text-orange-500 font-medium">Lunch · </span>{currentDay.meals.lunch}</p>
                  )}
                  {currentDay.meals.dinner && (
                    <p className="text-xs text-gray-600"><span className="text-orange-500 font-medium">Dinner · </span>{currentDay.meals.dinner}</p>
                  )}
                </div>
              </div>
            )}

            {/* Accommodation */}
            {currentDay?.accommodation && (
              <div className="mx-1 p-3.5 rounded-xl bg-white border border-gray-100 flex items-start gap-2">
                <BedDouble size={12} className="text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Stay</span>
                  <p className="text-xs text-gray-600 mt-0.5">{currentDay.accommodation}</p>
                </div>
              </div>
            )}

            {/* AI Suggestions */}
            <SuggestionsPanel />

            {/* Local tips */}
            {itineraryData.localTips && itineraryData.localTips.length > 0 && (
              <div className="mx-1 rounded-xl p-3.5 bg-amber-50/80 border border-amber-100">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-amber-600">Local Tips</p>
                <ul className="space-y-1.5">
                  {itineraryData.localTips.map((tip, i) => (
                    <li key={i} className="text-[11px] flex items-start gap-1.5 leading-relaxed text-gray-700">
                      <span className="shrink-0 mt-0.5 text-amber-500">·</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="h-4" />
      </div>
    </div>
  );
}

