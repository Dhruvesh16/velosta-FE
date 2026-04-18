"use client";
import { useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ChatWindow } from "@/components/velosta-ai/chat-window-ai";
import { hydrateItineraryIntoStores } from "@/lib/services/itinerary-hydrator";
import type { TripData } from "@/lib/types/planner.types";

export default function ChatPanel() {
  // When itinerary data lands, run the shared hydrator pipeline
  const handleItinerary = useCallback(
    async (rawData: unknown, rawTripData: TripData) => {
      await hydrateItineraryIntoStores(rawData, rawTripData);
    },
    []
  );

  return (
    <motion.div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: "#FFF9F3" }}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Panel header */}
      <div
        className="px-4 py-3 border-b border-[#D97757]/20 flex items-center gap-3 shrink-0 bg-white"
      >
        {/* Velosta AI logo mark */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm"
          style={{
            background: "linear-gradient(135deg, #d97757 0%, #d97757 100%)",
          }}
        >
          <Sparkles size={14} className="text-white" />
        </div>

        <div className="min-w-0">
          <p className="text-gray-800 text-xs font-semibold leading-tight">
            Velosta AI
          </p>
          <p className="text-[10px] leading-tight text-gray-400">
            Spatial Travel Planner
          </p>
        </div>

        {/* Online indicator */}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "#16A34A" }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: "#16A34A" }}
            />
          </span>
          <span className="text-[9px] font-medium text-gray-400">
            Active
          </span>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden relative">
        <ChatWindow onItinerary={handleItinerary} />
      </div>
    </motion.div>
  );
}
