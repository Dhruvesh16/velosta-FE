"use client";
/**
 * SpatialPlannerShell
 * ─────────────────────────────────────────────────────────────────
 * Google Maps-style layout:
 *   Desktop  : Full-screen Map (left) + Itinerary Panel (right, 420px)
 *              Floating draggable chat over the map
 *   Mobile   : Single panel at a time; bottom tab bar to switch
 * ─────────────────────────────────────────────────────────────────
 */
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Map, ListChecks } from "lucide-react";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { useUIStore, type MobileTab } from "@/lib/stores/ui-store";
import ChatPanel from "./chat-panel/chat-panel";
import ItineraryPanel from "./itinerary-panel/itinerary-panel";
import OnboardingHints from "../onboarding/onboarding-hints";

// Mapbox must be client-only (no SSR)
const MapPanel = dynamic(() => import("./map-panel/map-panel"), { ssr: false });

// ── Mobile tab bar config ─────────────────────────────────────────────────────
const TABS: { id: MobileTab; label: string; Icon: typeof Map }[] = [
  { id: "chat", label: "Chat", Icon: MessageCircle },
  { id: "map", label: "Map", Icon: Map },
  { id: "itinerary", label: "Itinerary", Icon: ListChecks },
];

const PANEL_VARIANTS = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export default function SpatialPlannerShell() {
  const { activeMobileTab, setMobileTab } = useUIStore();
  const { itinerary } = usePlannerStore();
  const hasItinerary = itinerary.length > 0;

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: "#FBF8F3" }}
      aria-label="Velosta AI Spatial Planner"
    >
      {/* ── Desktop / Tablet landscape: Itinerary (left) + Map (right) ─ */}
      <div className="hidden md:flex h-full w-full">
        {/* Itinerary panel — fluid: narrower on small laptops, wider on big screens */}
        <motion.div
          className="w-[300px] lg:w-[340px] xl:w-[380px] h-full border-r border-[#0B1F2A]/8 bg-[#FBF8F3] shrink-0 flex flex-col overflow-hidden"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <ItineraryPanel />
        </motion.div>

        {/* Map — fills remaining space */}
        <div className="flex-1 relative min-w-0">
          <div className="absolute inset-0">
            <MapPanel />
          </div>
        </div>
      </div>

      {/* ── Mobile / narrow tablet: single panel with tab bar ─────────── */}
      <div className="flex flex-col md:hidden h-full">
        {/* Active panel area */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait" initial={false}>
            {activeMobileTab === "chat" && (
              <motion.div
                key="chat"
                className="absolute inset-0"
                variants={PANEL_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.28 }}
              >
                <ChatPanel />
              </motion.div>
            )}

            {activeMobileTab === "map" && (
              <motion.div
                key="map"
                className="absolute inset-0"
                variants={PANEL_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.28 }}
              >
                <MapPanel />
              </motion.div>
            )}

            {activeMobileTab === "itinerary" && (
              <motion.div
                key="itinerary"
                className="absolute inset-0"
                variants={PANEL_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.28 }}
              >
                <ItineraryPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom tab bar */}
        <nav
          className="flex-shrink-0 flex items-center border-t"
          style={{
            borderColor: "rgba(11,31,42,0.08)",
            background: "rgba(251,248,243,0.97)",
            backdropFilter: "blur(20px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
          aria-label="Main navigation"
        >
          {TABS.map(({ id, label, Icon }) => {
            const active = activeMobileTab === id;
            const showBadge = id === "itinerary" && hasItinerary && !active;

            return (
              <button
                key={id}
                onClick={() => setMobileTab(id)}
                className="flex-1 flex flex-col items-center gap-1 py-3 relative transition-colors"
                aria-label={label}
                aria-current={active ? "page" : undefined}
              >
                <div className="relative">
                  <Icon
                    size={20}
                    style={{
                      color: active ? "#D97757" : "rgba(11,31,42,0.5)",
                      transition: "color 0.2s",
                    }}
                  />
                  {showBadge && (
                    <span
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                      style={{ background: "#D97757" }}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span
                  className="text-[10px] font-medium"
                  style={{
                    color: active ? "#D97757" : "rgba(11,31,42,0.5)",
                    transition: "color 0.2s",
                  }}
                >
                  {label}
                </span>
                {active && (
                  <motion.div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ background: "#D97757" }}
                    layoutId="tab-indicator"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* First-time onboarding hints */}
      <OnboardingHints />
    </div>
  );
}



