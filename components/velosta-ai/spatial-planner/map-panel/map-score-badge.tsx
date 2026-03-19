"use client";
import { motion, AnimatePresence } from "framer-motion";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { computeFeasibilityScore } from "@/lib/algorithms/feasibility-score";
import { useMemo } from "react";

export default function MapScoreBadge() {
  const { itinerary, tripData } = usePlannerStore();

  const result = useMemo(
    () => computeFeasibilityScore(itinerary, tripData),
    [itinerary, tripData]
  );

  return (
    <AnimatePresence>
      {itinerary.length > 0 && (
        <motion.div
          className="absolute bottom-6 left-6 z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div
            className="sp-glass px-4 py-3 flex items-center gap-3 shadow-lg"
            role="status"
            aria-label={`Feasibility: ${result.label}, score ${result.score}`}
          >
            {/* Score ring */}
            <div className="relative w-11 h-11 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                <circle
                  cx="22" cy="22" r="18"
                  fill="none"
                  stroke="rgba(217,119,6,0.12)"
                  strokeWidth="3"
                />
                <circle
                  cx="22" cy="22" r="18"
                  fill="none"
                  stroke={result.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${(result.score / 100) * 113} 113`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-gray-800 text-xs font-bold">{result.grade}</span>
              </div>
            </div>

            <div>
              <p className="text-gray-800 text-xs font-semibold">{result.label}</p>
              <p className="text-xs" style={{ color: result.color }}>
                {result.score}/100
              </p>
              {result.warnings.length > 0 && (
                <p className="text-xs mt-0.5 text-gray-400">
                  {result.warnings.length} note{result.warnings.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


