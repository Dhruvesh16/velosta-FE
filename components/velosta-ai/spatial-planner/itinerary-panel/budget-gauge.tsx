"use client";
import { motion } from "framer-motion";
import { usePlannerStore } from "@/lib/stores/planner-store";

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function BudgetGauge() {
  const { totalBudget, spentBudget, itineraryData } = usePlannerStore();

  const pct = totalBudget > 0 ? Math.min(1, spentBudget / totalBudget) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - pct);

  const color =
    pct <= 0.7
      ? "#16A34A"
      : pct <= 0.9
        ? "#F59E0B"
        : pct <= 1.0
          ? "#EA580C"
          : "#DC2626";

  if (!itineraryData) return null;

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 border-b border-amber-100 shrink-0 bg-white"
    >
      {/* Radial gauge */}
      <div className="relative w-20 h-20 shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
          <circle
            cx="44" cy="44" r={RADIUS}
            fill="none"
            stroke="rgba(251,191,36,0.15)"
            strokeWidth="6"
          />
          <motion.circle
            cx="44" cy="44" r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-gray-800 text-xs font-bold leading-none">
            {Math.round(pct * 100)}%
          </span>
          <span className="text-[9px] mt-0.5 text-gray-400">
            used
          </span>
        </div>
      </div>

      {/* Budget info */}
      <div className="flex-1 min-w-0">
        <p className="text-gray-800 text-sm font-semibold truncate">
          {itineraryData.destination}
        </p>
        <p className="text-xs mt-0.5 text-gray-400">
          {itineraryData.duration}
        </p>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Budget</span>
            <span className="text-gray-700 font-medium">
              {itineraryData.totalBudget || "—"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Planned</span>
            <span className="font-semibold" style={{ color }}>
              {itineraryData.totalEstimatedCost || "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
