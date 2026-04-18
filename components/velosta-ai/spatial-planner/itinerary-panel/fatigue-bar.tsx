"use client";
import { motion } from "framer-motion";
import type { FatigueLabel } from "@/lib/types/planner.types";

interface FatigueBarProps {
  score: number;
  label: FatigueLabel;
}

const COLOR_MAP: Record<FatigueLabel, string> = {
  Light: "#16A34A",
  Moderate: "#D97757",
  Intense: "#EA580C",
  Exhausting: "#DC2626",
};

export default function FatigueBar({ score, label }: FatigueBarProps) {
  const pct = Math.min(100, (score / 10) * 100);
  const color = COLOR_MAP[label];

  return (
    <div
      className="flex items-center gap-2 mt-1.5"
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={10}
      aria-label={`Day fatigue: ${label}`}
    >
      <div className="flex-1 h-1 rounded-full overflow-hidden bg-gray-100">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color }}>
        {label}
      </span>
    </div>
  );
}
