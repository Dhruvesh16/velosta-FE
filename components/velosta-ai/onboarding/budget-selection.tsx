"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, MapPin, Pencil, X } from "lucide-react";
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
  const [showCustom, setShowCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  function handleCustomSubmit() {
    const amount = parseInt(customAmount, 10);
    if (!amount || amount < 500) return;
    const customTier: BudgetTier = {
      id: "custom",
      label: "Custom Budget",
      range: `₹${amount.toLocaleString("en-IN")}`,
      min: Math.max(0, amount - 1000),
      max: amount,
      emoji: "🎯",
      tagline: "Your exact budget",
      examples: [],
      duration: "Flexible",
    };
    selectTier(customTier);
  }

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

        {/* Custom budget option */}
        <AnimatePresence mode="wait">
          {!showCustom ? (
            <motion.button
              key="custom-trigger"
              onClick={() => setShowCustom(true)}
              className="w-full mt-6 py-4 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 hover:border-amber-400 hover:bg-amber-50 transition-all flex items-center justify-center gap-2 text-amber-600 font-medium text-sm active:scale-[0.98]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.6 }}
            >
              <Pencil size={14} />
              Set your own budget
            </motion.button>
          ) : (
            <motion.div
              key="custom-input"
              className="mt-6 bg-white rounded-2xl border border-amber-200 p-5 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-800 font-semibold text-sm flex items-center gap-2">
                  <span className="text-lg">🎯</span> Custom Budget
                </p>
                <button
                  onClick={() => setShowCustom(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter amount"
                    min={500}
                    className="w-full pl-7 pr-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm font-medium placeholder:text-gray-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                    onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
                    autoFocus
                  />
                </div>
                <motion.button
                  onClick={handleCustomSubmit}
                  disabled={!customAmount || parseInt(customAmount, 10) < 500}
                  className="px-6 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40 transition-all"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Go →
                </motion.button>
              </div>
              <p className="text-gray-400 text-[11px] mt-2">Min ₹500 per person</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

