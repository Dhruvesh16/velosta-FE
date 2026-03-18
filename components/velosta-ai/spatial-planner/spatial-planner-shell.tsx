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
import { useCallback, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Map, ListChecks, GripVertical } from "lucide-react";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { useUIStore, type MobileTab } from "@/lib/stores/ui-store";
import ChatPanel from "./chat-panel/chat-panel";
import ItineraryPanel from "./itinerary-panel/itinerary-panel";
import OnboardingHints from "../onboarding/onboarding-hints";

const CHAT_WIDTH = 360;
const CHAT_MAX_HEIGHT = 640;
const PADDING = 16;
const ITINERARY_WIDTH = 420;

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function SpatialPlannerShell() {
  const { activeMobileTab, setMobileTab } = useUIStore();
  const { itinerary } = usePlannerStore();
  const hasItinerary = itinerary.length > 0;

  // Draggable chat panel state (desktop only); null = use default CSS position
  const [chatPosition, setChatPosition] = useState<{ x: number; y: number } | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number } | null>(null);

  const handleChatDragStart = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const el = chatRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = chatPosition?.x ?? rect.left;
    const y = chatPosition?.y ?? rect.top;
    if (chatPosition === null) setChatPosition({ x, y });
    dragStartRef.current = { clientX: e.clientX, clientY: e.clientY, startX: x, startY: y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [chatPosition]);

  const handleChatDragMove = useCallback((e: PointerEvent) => {
    const start = dragStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.clientX;
    const dy = e.clientY - start.clientY;
    const maxX = window.innerWidth - CHAT_WIDTH - PADDING - ITINERARY_WIDTH;
    const maxY = window.innerHeight - Math.min(CHAT_MAX_HEIGHT, window.innerHeight * 0.75) - PADDING;
    setChatPosition({
      x: clamp(start.startX + dx, PADDING, maxX),
      y: clamp(start.startY + dy, PADDING, maxY),
    });
  }, []);

  const handleChatDragEnd = useCallback(() => {
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("pointermove", handleChatDragMove);
    window.addEventListener("pointerup", handleChatDragEnd);
    window.addEventListener("pointercancel", handleChatDragEnd);
    return () => {
      window.removeEventListener("pointermove", handleChatDragMove);
      window.removeEventListener("pointerup", handleChatDragEnd);
      window.removeEventListener("pointercancel", handleChatDragEnd);
    };
  }, [handleChatDragMove, handleChatDragEnd]);

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: "#FAFAFA" }}
      aria-label="Velosta AI Spatial Planner"
    >
      {/* ── Desktop: Map (left) + Itinerary Panel (right) ──────────────── */}
      <div className="hidden lg:flex h-full w-full">
        {/* Map — fills remaining space */}
        <div className="flex-1 relative min-w-0">
          <div className="absolute inset-0">
            <MapPanel />
          </div>

          {/* Floating draggable AI chat */}
          <motion.div
            ref={chatRef}
            className={`absolute z-10 w-[360px] max-h-[min(75vh,640px)] flex flex-col rounded-2xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.06)] bg-white/95 backdrop-blur-xl ${!chatPosition ? "left-5 top-1/2 -translate-y-1/2" : ""}`}
            style={chatPosition ? { left: chatPosition.x, top: chatPosition.y } : undefined}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-14 z-20 flex items-center justify-end pr-2 cursor-grab active:cursor-grabbing select-none touch-none"
              onPointerDown={handleChatDragStart}
              onPointerUp={handleChatDragEnd}
              onPointerCancel={handleChatDragEnd}
              aria-label="Drag to move chat"
            >
              <GripVertical size={14} className="text-gray-400/80 hover:text-gray-500" aria-hidden />
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <ChatPanel />
            </div>
          </motion.div>
        </div>

        {/* Itinerary panel — fixed width right side */}
        <motion.div
          className="w-[420px] h-full border-l border-gray-200 bg-white shrink-0 flex flex-col overflow-hidden"
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



