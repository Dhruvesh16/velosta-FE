"use client";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { Map, FileDown, RotateCcw } from "lucide-react";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { useUIStore } from "@/lib/stores/ui-store";
import BudgetGauge from "./budget-gauge";
import DayCard from "./day-card";
import SuggestionsPanel from "./suggestions-panel";
import { exportItineraryPDF } from "@/lib/services/index";

export default function ItineraryPanel() {
  const {
    itinerary,
    itineraryData,
    tripData,
    activeDay,
    reorderDays,
    reorderActivities,
  } = usePlannerStore();
  const { setMobileTab } = useUIStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Try day-level reorder first
    const activeDayIdx = itinerary.findIndex((d) => d.id === activeId);
    const overDayIdx = itinerary.findIndex((d) => d.id === overId);
    if (activeDayIdx !== -1 && overDayIdx !== -1) {
      reorderDays(activeDayIdx, overDayIdx);
      return;
    }

    // Try activity-level reorder within same day
    for (let d = 0; d < itinerary.length; d++) {
      const rows = itinerary[d].rows;
      const fromIdx = rows.findIndex((r) => r.id === activeId);
      const toIdx = rows.findIndex((r) => r.id === overId);
      if (fromIdx !== -1 && toIdx !== -1) {
        reorderActivities(d, fromIdx, toIdx);
        return;
      }
    }
  }

  async function handleExportPDF() {
    if (!itineraryData) return;
    await exportItineraryPDF(itineraryData, tripData);
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!itineraryData) {
    const hints = [
      "Try: \"Plan a 3-day trip to Goa under ₹8,000\"",
      "Try: \"I want a weekend getaway near Bangalore\"",
      "Try: \"Suggest a solo backpacking trip to Rishikesh\"",
      "Try: \"Family trip to Jaipur, 4 days, ₹12,000 budget\"",
    ];

    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center bg-[#FFF9F3]">
        {/* Animated map icon */}
        <motion.div
          className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Map size={24} className="text-amber-500" />
        </motion.div>

        <div>
          <p className="text-gray-800 text-sm font-semibold mb-1">
            Your itinerary will appear here
          </p>
          <p className="text-xs leading-relaxed text-gray-400 max-w-[220px] mx-auto">
            Chat with Velosta AI to generate a day-by-day travel plan
          </p>
        </div>

        {/* Rotating hint */}
        <AnimatePresence mode="wait">
          <motion.p
            key={Math.floor(Date.now() / 4000) % hints.length}
            className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-4 py-1.5 max-w-[260px]"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
          >
            {hints[Math.floor(Date.now() / 4000) % hints.length]}
          </motion.p>
        </AnimatePresence>

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
    <div className="flex flex-col h-full min-h-0 bg-[#FFF9F3]">
      {/* Budget gauge — sticky header */}
      <BudgetGauge />

      {/* Action bar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-100 shrink-0 bg-white"
      >
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all flex-1 justify-center bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100"
          aria-label="Export PDF"
        >
          <FileDown size={12} />
          Export PDF
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all flex-1 justify-center bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100"
          aria-label="Modify itinerary in chat"
        >
          <RotateCcw size={12} />
          Modify
        </button>
      </div>

      {/* Scrollable day list */}
      <div className="flex-1 overflow-y-auto sp-panel-scroll px-3 py-3 space-y-2 min-h-0" style={{ scrollbarColor: "rgba(218,136,15,0.2) transparent" }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={itinerary.map((d) => d.id)}
            strategy={verticalListSortingStrategy}
          >
            <AnimatePresence initial={false}>
              {itinerary.map((day, i) => (
                <motion.div
                  key={day.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: i * 0.04, duration: 0.28 }}
                  layout
                >
                  <DayCard day={day} dayIndex={i} isActive={i === activeDay} />
                </motion.div>
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>

        {/* AI Suggestions — "Try Instead" */}
        <SuggestionsPanel />

        {/* Local tips */}
        {itineraryData.localTips && itineraryData.localTips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: itinerary.length * 0.04 + 0.1, duration: 0.3 }}
            className="rounded-2xl p-4 bg-amber-50 border border-amber-200"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-amber-600">
              ✦ Local Tips
            </p>
            <ul className="space-y-1.5">
              {itineraryData.localTips.map((tip, i) => (
                <li
                  key={i}
                  className="text-[10px] flex items-start gap-1.5 leading-relaxed text-amber-800"
                >
                  <span className="shrink-0 mt-0.5 text-amber-500">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Bottom spacer */}
        <div className="h-4" />
      </div>
    </div>
  );
}

