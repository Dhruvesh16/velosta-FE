"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, ArrowRightLeft, BadgePercent } from "lucide-react";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { useState } from "react";
import type { Suggestion } from "@/lib/types/planner.types";

function SuggestionCard({
  suggestion,
  index,
  onSwap,
}: {
  suggestion: Suggestion;
  index: number;
  onSwap: (s: Suggestion) => void;
}) {
  return (
    <motion.div
      className="bg-white border border-amber-100 rounded-xl p-3.5 group hover:border-amber-300 transition-colors"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      whileHover={{ y: -1 }}
    >
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb size={13} className="text-amber-500" />
        </div>

        <div className="flex-1 min-w-0">
          {/* What to replace */}
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-0.5">
            Instead of
          </p>
          <p className="text-xs text-gray-500 line-through truncate">
            {suggestion.replaces}
          </p>

          {/* Alternative */}
          <p className="text-[10px] text-amber-600 uppercase tracking-wider font-medium mt-2 mb-0.5">
            Try this
          </p>
          <p className="text-xs text-gray-800 font-medium truncate">
            {suggestion.alternative}
          </p>

          {/* Reason */}
          <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed line-clamp-2">
            {suggestion.reason}
          </p>

          {/* Savings badge */}
          {suggestion.savingsEstimate && (
            <div className="flex items-center gap-1 mt-2">
              <BadgePercent size={10} className="text-green-500" />
              <span className="text-[10px] font-semibold text-green-600">
                {suggestion.savingsEstimate}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Swap button */}
      <button
        onClick={() => onSwap(suggestion)}
        className="mt-3 w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg py-2 hover:bg-amber-100 transition-colors active:scale-[0.98]"
      >
        <ArrowRightLeft size={11} />
        Swap
      </button>
    </motion.div>
  );
}

export default function SuggestionsPanel() {
  const { itineraryData } = usePlannerStore();
  const [collapsed, setCollapsed] = useState(false);

  const suggestions = itineraryData?.suggestions;
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      className="rounded-2xl border border-amber-200 overflow-hidden bg-gradient-to-b from-amber-50/50 to-white"
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-amber-50/50 transition-colors"
      >
        <Lightbulb size={14} className="text-amber-500" />
        <span className="text-xs font-semibold text-amber-700 flex-1">
          Try Instead
        </span>
        <span className="text-[10px] text-amber-400 bg-amber-100 px-2 py-0.5 rounded-full">
          {suggestions.length}
        </span>
        <motion.span
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-amber-400 text-xs"
        >
          ▼
        </motion.span>
      </button>

      {/* Cards */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {suggestions.map((s, i) => (
                <SuggestionCard
                  key={`${s.replaces}-${i}`}
                  suggestion={s}
                  index={i}
                  onSwap={(suggestion) => {
                    // Find the activity matching suggestion.replaces and patch it
                    const { itinerary, patchActivity } = usePlannerStore.getState();
                    for (let d = 0; d < itinerary.length; d++) {
                      const actIdx = itinerary[d].rows.findIndex(
                        (r) =>
                          r.activity.toLowerCase() ===
                          suggestion.replaces.toLowerCase()
                      );
                      if (actIdx !== -1) {
                        patchActivity(d, actIdx, {
                          activity: suggestion.alternative,
                          description: suggestion.reason,
                        });
                        break;
                      }
                    }
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

