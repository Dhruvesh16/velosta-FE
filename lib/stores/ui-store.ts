// ── UI Store — Zustand ────────────────────────────────────────────────────────
// Controls panel visibility and mobile tab navigation

import { create } from "zustand";

export type MobileTab = "chat" | "map" | "itinerary";
export type PlannerRefineChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};
export type PlannerChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isItinerary?: boolean;
  itineraryData?: unknown;
};
export type PlannerChatTripData = {
  destination?: string;
  budget?: string;
};

interface UIState {
  activeMobileTab: MobileTab;
  isItineraryOpen: boolean;
  isChatOpen: boolean;
  isReducedMotion: boolean;
  isHighContrast: boolean;
  plannerRefineMessages: PlannerRefineChatMessage[];
  plannerRefineExpanded: boolean;
  plannerChatMessages: PlannerChatMessage[];
  plannerChatConversationHistory: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  plannerChatCurrentItinerary: unknown | null;
  plannerChatTripData: PlannerChatTripData;

  setMobileTab: (tab: MobileTab) => void;
  toggleItinerary: () => void;
  toggleChat: () => void;
  setReducedMotion: (v: boolean) => void;
  setHighContrast: (v: boolean) => void;
  setPlannerRefineMessages: (messages: PlannerRefineChatMessage[]) => void;
  appendPlannerRefineMessage: (message: PlannerRefineChatMessage) => void;
  clearPlannerRefineMessages: () => void;
  setPlannerRefineExpanded: (expanded: boolean) => void;
  setPlannerChatMessages: (messages: PlannerChatMessage[]) => void;
  appendPlannerChatMessage: (message: PlannerChatMessage) => void;
  setPlannerChatConversationHistory: (
    history: Array<{ role: "user" | "assistant" | "system"; content: string }>
  ) => void;
  setPlannerChatCurrentItinerary: (itinerary: unknown | null) => void;
  setPlannerChatTripData: (tripData: PlannerChatTripData) => void;
  clearPlannerChatState: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeMobileTab: "chat",
  isItineraryOpen: true,
  isChatOpen: true,
  isReducedMotion: false,
  isHighContrast: false,
  plannerRefineMessages: [],
  plannerRefineExpanded: false,
  plannerChatMessages: [],
  plannerChatConversationHistory: [],
  plannerChatCurrentItinerary: null,
  plannerChatTripData: {},

  setMobileTab: (tab) => set({ activeMobileTab: tab }),
  toggleItinerary: () => set((s) => ({ isItineraryOpen: !s.isItineraryOpen })),
  toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),
  setReducedMotion: (v) => set({ isReducedMotion: v }),
  setHighContrast: (v) => set({ isHighContrast: v }),
  setPlannerRefineMessages: (messages) => set({ plannerRefineMessages: messages }),
  appendPlannerRefineMessage: (message) =>
    set((s) => ({ plannerRefineMessages: [...s.plannerRefineMessages, message] })),
  clearPlannerRefineMessages: () => set({ plannerRefineMessages: [] }),
  setPlannerRefineExpanded: (expanded) => set({ plannerRefineExpanded: expanded }),
  setPlannerChatMessages: (messages) => set({ plannerChatMessages: messages }),
  appendPlannerChatMessage: (message) =>
    set((s) => ({ plannerChatMessages: [...s.plannerChatMessages, message] })),
  setPlannerChatConversationHistory: (history) => set({ plannerChatConversationHistory: history }),
  setPlannerChatCurrentItinerary: (itinerary) => set({ plannerChatCurrentItinerary: itinerary }),
  setPlannerChatTripData: (tripData) => set({ plannerChatTripData: tripData }),
  clearPlannerChatState: () =>
    set({
      plannerChatMessages: [],
      plannerChatConversationHistory: [],
      plannerChatCurrentItinerary: null,
      plannerChatTripData: {},
    }),
}));

