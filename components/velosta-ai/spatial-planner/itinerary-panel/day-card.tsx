"use client";
import { useState } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Utensils, BedDouble } from "lucide-react";
import FatigueBar from "./fatigue-bar";
import ActivityRowItem from "./activity-row";
import { usePlannerStore } from "@/lib/stores/planner-store";
import type { ItineraryDay, FatigueLabel } from "@/lib/types/planner.types";

interface DayCardProps {
  day: ItineraryDay;
  dayIndex: number;
  isActive: boolean;
}

// Warm amber-based palette for day badges
const DAY_COLORS = [
  "#D97706", "#B45309", "#92400E", "#EA580C",
  "#F59E0B", "#C2410C", "#A16207", "#D97706",
];

export default function DayCard({ day, dayIndex, isActive }: DayCardProps) {
  const [expanded, setExpanded] = useState(isActive);
  const { setActiveDay } = usePlannerStore();
  const color = DAY_COLORS[dayIndex % DAY_COLORS.length];

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next) setActiveDay(dayIndex);
  }

  return (
    <motion.div
      className="rounded-2xl overflow-hidden border transition-colors duration-200 bg-white"
      style={{
        borderColor: isActive ? `${color}60` : "rgba(251,191,36,0.2)",
        boxShadow: isActive ? `0 0 0 1px ${color}20` : "none",
      }}
      whileHover={{ y: -2, boxShadow: `0 8px 24px rgba(217,119,6,0.08)` }}
      transition={{ duration: 0.15 }}
    >
      {/* Day header button */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 rounded-2xl"
        aria-expanded={expanded}
        aria-controls={`day-content-${day.id}`}
      >
        {/* Day number badge */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
          style={{ background: color }}
        >
          {day.day}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-gray-800 text-xs font-semibold truncate leading-tight">
            {day.theme || `Day ${day.day}`}
          </p>
          {day.fatigueLabel && (
            <FatigueBar
              score={day.fatigueScore ?? 0}
              label={day.fatigueLabel as FatigueLabel}
            />
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {day.dailyCost && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ background: `${color}18`, color }}
            >
              {day.dailyCost}
            </span>
          )}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={14} className="text-gray-400" />
          </motion.div>
        </div>
      </button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={`day-content-${day.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-1 pb-3">
              {/* Activities (sortable) */}
              <SortableContext
                items={day.rows.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                {day.rows.map((row, i) => (
                  <ActivityRowItem
                    key={row.id}
                    row={row}
                    dayIndex={dayIndex}
                    activityIndex={i}
                  />
                ))}
              </SortableContext>

              {/* Meals row */}
              {day.meals && Object.values(day.meals).some(Boolean) && (
                <div
                  className="mt-2 mx-3 px-3 py-2.5 rounded-xl space-y-1 bg-amber-50 border border-amber-100"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Utensils size={10} className="text-amber-500" />
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-600">
                      Meals
                    </span>
                  </div>
                  {day.meals.breakfast && (
                    <p className="text-[10px] text-gray-600">
                      <span className="text-amber-500">Breakfast · </span>
                      {day.meals.breakfast}
                    </p>
                  )}
                  {day.meals.lunch && (
                    <p className="text-[10px] text-gray-600">
                      <span className="text-amber-500">Lunch · </span>
                      {day.meals.lunch}
                    </p>
                  )}
                  {day.meals.dinner && (
                    <p className="text-[10px] text-gray-600">
                      <span className="text-amber-500">Dinner · </span>
                      {day.meals.dinner}
                    </p>
                  )}
                </div>
              )}

              {/* Accommodation */}
              {day.accommodation && (
                <div className="mt-2 mx-3 px-3 py-2.5 rounded-xl flex items-start gap-2 bg-orange-50 border border-orange-100">
                  <BedDouble size={10} className="text-orange-400 mt-0.5 shrink-0" />
                  <p className="text-[10px] leading-snug text-gray-600">
                    {day.accommodation}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
