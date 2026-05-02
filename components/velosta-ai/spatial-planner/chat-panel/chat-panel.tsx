"use client";
import { useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ChatWindow } from "@/components/velosta-ai/chat-window-ai";
import { hydrateItineraryIntoStores } from "@/lib/services/itinerary-hydrator";
import type { TripData } from "@/lib/types/planner.types";

export default function ChatPanel({ embedded = false }: { embedded?: boolean }) {
  // When itinerary data lands, run the shared hydrator pipeline
  const handleItinerary = useCallback(
    async (rawData: unknown, rawTripData: TripData) => {
      await hydrateItineraryIntoStores(rawData, rawTripData);
    },
    []
  );

  const body = (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-[#FBF8F3]">
      {!embedded && (
        <div className="px-4 py-3.5 border-b border-[#0B1F2A]/8 flex items-center gap-3 shrink-0 bg-[#FBF8F3] relative">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(217,119,87,0.35), rgba(184,95,68,0.85) 70%)",
              boxShadow: "0 4px 14px -4px rgba(217,119,87,0.45)",
            }}
          >
            <Sparkles size={15} className="text-white" strokeWidth={2} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.28em] text-[#2F6F73] mb-0.5">
              Velosta AI
            </p>
            <p className="text-[13px] font-serif font-semibold text-[#0B1F2A] leading-tight truncate">
              Spatial travel planner
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2 w-2">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: "#2F6F73" }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: "#2F6F73" }}
              />
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#0B1F2A]/45">
              Live
            </span>
          </div>
          <span
            aria-hidden
            className="absolute left-4 right-4 bottom-0 h-px pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, rgba(217,119,87,0.4) 0%, rgba(217,119,87,0.1) 40%, transparent 100%)",
            }}
          />
        </div>
      )}

      <div className="flex-1 overflow-hidden relative min-h-0">
        <ChatWindow onItinerary={handleItinerary} hideSessionHint={embedded} />
      </div>
    </div>
  );

  if (embedded) return body;

  return (
    <motion.div
      className="flex flex-col h-full overflow-hidden bg-[#FBF8F3]"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {body}
    </motion.div>
  );
}
