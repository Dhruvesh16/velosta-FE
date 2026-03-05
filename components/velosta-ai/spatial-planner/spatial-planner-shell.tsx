"use client";
/**
 * SpatialPlannerShell
 * ─────────────────────────────────────────────────────────────────
 * Orchestrates the full-screen 3-panel layout:
 *   [Chat Panel] | [Map Panel] | [Itinerary Panel]
 *
 * Desktop (lg+) : CSS grid, all 3 columns always visible
 * Mobile (<lg)  : Single panel at a time; bottom tab bar to switch
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
      style={{ background: "#FFF9F3" }}
      aria-label="Velosta AI Spatial Planner"
    >
      {/* ── Desktop: 3-panel grid ─────────────────────────────────────────── */}
      <div className="hidden lg:grid h-full w-full" style={{
        gridTemplateColumns: `var(--sp-panel-chat, 380px) 1fr var(--sp-panel-itinerary, 420px)`,
      }}>
        {/* Left — Chat (warm amber theme) */}
        <div
          className="h-full overflow-hidden border-r"
          style={{ borderColor: "rgba(251,191,36,0.25)" }}
        >
          <ChatPanel />
        </div>

        {/* Centre — Map */}
        <div className="h-full overflow-hidden relative">
          <MapPanel />
        </div>

        {/* Right — Itinerary */}
        <motion.div
          className="h-full overflow-hidden border-l"
          style={{ borderColor: "rgba(251,191,36,0.25)" }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <ItineraryPanel />
        </motion.div>
      </div>

      {/* ── Mobile: single panel with tab bar ────────────────────────────── */}
      <div className="flex flex-col lg:hidden h-full">
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
            borderColor: "rgba(251,191,36,0.3)",
            background: "rgba(255,249,243,0.97)",
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
                      color: active ? "#D97706" : "rgba(107,114,128,0.7)",
                      transition: "color 0.2s",
                    }}
                  />
                  {showBadge && (
                    <span
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                      style={{ background: "#D97706" }}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span
                  className="text-[10px] font-medium"
                  style={{
                    color: active ? "#D97706" : "rgba(107,114,128,0.7)",
                    transition: "color 0.2s",
                  }}
                >
                  {label}
                </span>
                {active && (
                  <motion.div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ background: "#D97706" }}
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



