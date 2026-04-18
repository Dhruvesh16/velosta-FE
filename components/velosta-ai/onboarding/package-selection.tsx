"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, MapPin, IndianRupee, Sparkles } from "lucide-react";
import {
  useOnboardingStore,
  TRAVEL_PACKAGES,
  type TravelPackage,
} from "@/lib/stores/onboarding-store";

function PackageCard({
  pkg,
  index,
  onSelect,
}: {
  pkg: TravelPackage;
  index: number;
  onSelect: (p: TravelPackage) => void;
}) {
  return (
    <motion.button
      onClick={() => onSelect(pkg)}
      className="group relative w-full text-left bg-white rounded-2xl border border-[#D97757]/20 overflow-hidden transition-colors hover:border-[#D97757]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]/40"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.1 + index * 0.06,
        duration: 0.4,
        type: "spring",
        stiffness: 260,
        damping: 24,
      }}
      whileHover={{ y: -3, boxShadow: "0 12px 32px rgba(217,119,6,0.12)" }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Top banner */}
      <div className="px-5 pt-5 pb-3 flex items-start gap-3">
        <span className="text-3xl">{pkg.image}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-base leading-tight truncate">
            {pkg.name}
          </p>
          <p className="text-[#2F6F73] font-semibold text-sm">{pkg.destination}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[#0B1F2A] font-bold text-lg">{pkg.costLabel}</p>
          <p className="text-gray-400 text-[10px]">per person</p>
        </div>
      </div>

      {/* Meta */}
      <div className="px-5 pb-2 flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {pkg.days} {pkg.days === 1 ? "day" : "days"}
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={11} />
          {pkg.itineraryPoints.length} stops
        </span>
      </div>

      {/* Highlights */}
      <div className="px-5 pb-4">
        <div className="flex flex-wrap gap-1.5">
          {pkg.highlights.map((h) => (
            <span
              key={h}
              className="bg-[#F5EFE6]/60 border border-[#D97757]/20 text-[#0B1F2A] text-[10px] px-2 py-0.5 rounded-full"
            >
              {h}
            </span>
          ))}
        </div>
      </div>

      {/* Arrow */}
      <div className="absolute top-5 right-5 w-7 h-7 rounded-full bg-[#F5EFE6]/60 flex items-center justify-center text-[#D97757] opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-sm">→</span>
      </div>
    </motion.button>
  );
}

export default function PackageSelection() {
  const { selectedTier, selectPackage, setFlowStep } = useOnboardingStore();

  const packages = useMemo(() => {
    if (!selectedTier) return TRAVEL_PACKAGES;
    if (selectedTier.id === "custom") {
      // For custom budget, show packages that fit within the custom max
      return TRAVEL_PACKAGES.filter((p) => p.cost <= selectedTier.max);
    }
    // Show packages for matching tier, plus any that fit within price range
    return TRAVEL_PACKAGES.filter(
      (p) => p.tierId === selectedTier.id || (p.cost >= selectedTier.min && p.cost <= selectedTier.max)
    );
  }, [selectedTier]);

  return (
    <div className="fixed inset-0 bg-[#FFF9F3] overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-[#FFF9F3]/90 backdrop-blur-md border-b border-[#D97757]/15">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => setFlowStep("budget")}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft size={14} />
          </button>
          <div className="flex-1">
            <p className="text-gray-800 font-semibold text-sm">
              Travel Packages
            </p>
            <p className="text-gray-400 text-[11px]">
              {selectedTier?.emoji} {selectedTier?.label} · {selectedTier?.range}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 leading-tight">
            <span className="bg-gradient-to-r from-[#D97757] to-orange-600 bg-clip-text text-transparent">
              Curated packages
            </span>{" "}
            for you
          </h2>
          <p className="text-gray-400 text-sm mt-2">
            Select a package to explore it on the map with all stops marked.
          </p>
        </motion.div>

        {packages.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {packages.map((pkg, i) => (
              <PackageCard key={pkg.id} pkg={pkg} index={i} onSelect={selectPackage} />
            ))}
          </div>
        ) : (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-3xl mb-3">📦</p>
            <h3 className="text-gray-800 font-semibold text-sm mb-2">
              No packages found
            </h3>
            <p className="text-gray-400 text-xs mb-4">
              No packages match your budget range. Try a different budget.
            </p>
            <button
              onClick={() => setFlowStep("budget")}
              className="text-xs px-5 py-2.5 rounded-full font-medium bg-[#D97757] text-white hover:bg-[#B85F44] transition-all active:scale-95"
            >
              Change Budget
            </button>
          </motion.div>
        )}

        {/* Or continue to custom trip */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-gray-400 text-xs mb-3">
            Want something different?
          </p>
          <button
            onClick={() => {
              // Clear any previously selected package so explore-map doesn't show stale data
              useOnboardingStore.setState({ selectedPackage: null, selectedDestination: null });
              setFlowStep("trip-inputs");
            }}
            className="text-xs px-5 py-2.5 rounded-full font-medium border border-[#0B1F2A]/12 text-[#2F6F73] hover:bg-[#F5EFE6]/60 transition-all active:scale-95"
          >
            <Sparkles size={12} className="inline mr-1.5 -mt-0.5" />
            Build a custom trip with AI
          </button>
        </motion.div>
      </div>
    </div>
  );
}
