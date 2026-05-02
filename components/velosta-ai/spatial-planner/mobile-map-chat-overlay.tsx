"use client";

import { motion } from "framer-motion";
import { MessageCircle, Minus, Sparkles } from "lucide-react";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { useUIStore } from "@/lib/stores/ui-store";
import ChatPanel from "./chat-panel/chat-panel";
import ItineraryPanel from "./itinerary-panel/itinerary-panel";

/**
 * Mobile map tab: bottom sheet for Chat (pre-itinerary) or Refine (post-itinerary),
 * with collapse to a slim peek bar (line handle, like the discover sheet).
 */
export default function MobileMapChatOverlay() {
  const collapsed = useUIStore((s) => s.mobileMapChatCollapsed);
  const setCollapsed = useUIStore((s) => s.setMobileMapChatCollapsed);
  const { itinerary, itineraryData } = usePlannerStore();
  const hasItinerary = itinerary.length > 0;
  const destination = itineraryData?.destination?.trim();

  const title = hasItinerary ? "Refine trip" : "Velosta AI";
  const subtitle = hasItinerary ? "Streaming · map updates live" : "Plan your route on the map";

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[35] flex flex-col justify-end"
      aria-label="Map chat"
    >
      <motion.div
        className="pointer-events-auto flex flex-col rounded-t-[22px] border border-[#0B1F2A]/10 border-b-0 bg-[#FBF8F3] shadow-[0_-14px_48px_-18px_rgba(11,31,42,0.22)] overflow-hidden mx-2 mb-2"
        initial={false}
        animate={{
          height: collapsed ? 56 : "56vh",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        style={{ maxHeight: "calc(100% - env(safe-area-inset-bottom, 0px) - 88px)" }}
      >
        {/* Chrome */}
        <div className="shrink-0 border-b border-[#0B1F2A]/8 bg-[#FBF8F3]">
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left min-h-[56px]"
              aria-label={`Open ${title}`}
            >
              <span
                className="block w-10 h-1 rounded-full bg-[#0B1F2A]/20 shrink-0"
                aria-hidden
              />
              <span
                className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(217,119,87,0.35), rgba(184,95,68,0.88) 70%)",
                  boxShadow: "0 3px 10px -3px rgba(217,119,87,0.45)",
                }}
              >
                {hasItinerary ? (
                  <Sparkles size={15} className="text-white" strokeWidth={2} />
                ) : (
                  <MessageCircle size={15} className="text-white" strokeWidth={2} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold font-serif text-[#0B1F2A] leading-tight truncate">
                  {title}
                </p>
                <p className="text-[10px] text-[#0B1F2A]/45 truncate">{subtitle}</p>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-2 py-2 min-h-[52px]">
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="p-2.5 rounded-full hover:bg-[#0B1F2A]/5 text-[#0B1F2A]/45 hover:text-[#0B1F2A]/80 transition-colors shrink-0"
                aria-label="Minimize Velosta chat"
              >
                <Minus size={22} strokeWidth={2.5} aria-hidden />
              </button>
              <div className="flex-1 min-w-0 text-center px-1">
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.28em] text-[#2F6F73] truncate">
                  {hasItinerary ? "Refine" : "Chat"}
                </p>
                <p className="text-[12px] font-semibold font-serif text-[#0B1F2A] truncate">
                  {hasItinerary ? destination || "Your trip" : "On the map"}
                </p>
              </div>
              <div className="w-11 shrink-0" aria-hidden />
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {hasItinerary ? (
              <ItineraryPanel variant="refineOnly" mapOverlay />
            ) : (
              <ChatPanel embedded />
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
