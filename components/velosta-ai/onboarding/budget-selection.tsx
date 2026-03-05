"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Clock, MapPin } from "lucide-react";
import {
  useOnboardingStore,
  BUDGET_TIERS,
  type BudgetTier,
} from "@/lib/stores/onboarding-store";

function BudgetCard({
  tier,
  index,
  onSelect,
}: {
  tier: BudgetTier;
  index: number;
  onSelect: (t: BudgetTier) => void;
}) {
  return (
    <motion.button
      onClick={() => onSelect(tier)}
      className="group relative w-full text-left bg-white rounded-2xl border border-amber-100 p-5 md:p-6 overflow-hidden transition-colors hover:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.15 + index * 0.08,
        duration: 0.4,
        type: "spring",
        stiffness: 260,
        damping: 24,
      }}
      whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(217,119,6,0.12)" }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Background gradient accent */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
        style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}
      />

      <div className="relative z-10">
        {/* Emoji + Title */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{tier.emoji}</span>
          <div>
            <p className="font-semibold text-gray-800 text-sm leading-tight">
              {tier.label}
            </p>
            <p className="text-amber-600 font-bold text-base">{tier.range}</p>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-gray-500 text-xs leading-relaxed mb-3">
          {tier.tagline}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {tier.duration}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {tier.examples.slice(0, 2).join(", ")}
          </span>
        </div>

        {/* Arrow indicator */}
        <div className="absolute top-5 right-5 w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-sm">→</span>
        </div>
      </div>
    </motion.button>
  );
}

export default function BudgetSelection() {
  const { selectTier, setFlowStep } = useOnboardingStore();

  return (
    <div className="fixed inset-0 bg-[#FFF9F3] overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-[#FFF9F3]/90 backdrop-blur-md border-b border-amber-100/60">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => setFlowStep("landing")}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft size={14} />
          </button>
          <div>
            <p className="text-gray-800 font-semibold text-sm">
              Choose your budget
            </p>
            <p className="text-gray-400 text-[11px]">
              We'll find destinations that match
            </p>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 leading-tight">
            What's your{" "}
            <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
              travel budget
            </span>
            ?
          </h2>
          <p className="text-gray-400 text-sm mt-2">
            Pick a range — we'll show you every incredible place you can reach.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BUDGET_TIERS.map((tier, i) => (
            <BudgetCard
              key={tier.id}
              tier={tier}
              index={i}
              onSelect={selectTier}
            />
          ))}
        </div>

        {/* Custom budget hint */}
        <motion.p
          className="text-center text-xs text-gray-400 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Or just tell the AI your exact budget — it'll adapt to anything.
        </motion.p>
      </div>
    </div>
  );
}

