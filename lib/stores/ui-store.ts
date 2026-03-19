// ── UI Store — Zustand ────────────────────────────────────────────────────────
// Controls panel visibility and mobile tab navigation

import { create } from "zustand";

export type MobileTab = "chat" | "map" | "itinerary";

interface UIState {
  activeMobileTab: MobileTab;
  isItineraryOpen: boolean;
  isChatOpen: boolean;
  isReducedMotion: boolean;
  isHighContrast: boolean;

  setMobileTab: (tab: MobileTab) => void;
  toggleItinerary: () => void;
  toggleChat: () => void;
  setReducedMotion: (v: boolean) => void;
  setHighContrast: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeMobileTab: "chat",
  isItineraryOpen: true,
  isChatOpen: true,
  isReducedMotion: false,
  isHighContrast: false,

  setMobileTab: (tab) => set({ activeMobileTab: tab }),
  toggleItinerary: () => set((s) => ({ isItineraryOpen: !s.isItineraryOpen })),
  toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),
  setReducedMotion: (v) => set({ isReducedMotion: v }),
  setHighContrast: (v) => set({ isHighContrast: v }),
}));

