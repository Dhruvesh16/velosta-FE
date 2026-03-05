// ── Onboarding Store — Zustand ────────────────────────────────────────────────
// Controls the entry flow: landing → budget → trip-inputs → explore → planner

import { create } from "zustand";

export type FlowStep = "landing" | "budget" | "trip-inputs" | "explore" | "planner";

export interface UserLocation {
  name: string;
  coordinates: [number, number]; // [lng, lat]
}

export interface DiscoveredDestination {
  id: string;
  name: string;
  state: string;
  coordinates: [number, number]; // [lng, lat]
  estimatedCost: string;
  recommendedDays: number;
  highlights: string[];
  season: string;
  tagline: string;
  /** Pin color category based on budget fit */
  budgetFit: "perfect" | "stretch" | "premium";
}

export interface BudgetTier {
  id: string;
  label: string;
  range: string;
  min: number;
  max: number;
  emoji: string;
  tagline: string;
  examples: string[];
  duration: string;
}

export const BUDGET_TIERS: BudgetTier[] = [
  {
    id: "budget",
    label: "Budget Explorer",
    range: "₹3,000 – ₹5,000",
    min: 3000,
    max: 5000,
    emoji: "🎒",
    tagline: "Backpack-friendly getaways",
    examples: ["Pondicherry", "Hampi", "Rishikesh"],
    duration: "2–3 days",
  },
  {
    id: "mid",
    label: "Comfort Traveler",
    range: "₹5,000 – ₹8,000",
    min: 5000,
    max: 8000,
    emoji: "✨",
    tagline: "Comfort meets adventure",
    examples: ["Udaipur", "Goa", "Kodaikanal"],
    duration: "3–4 days",
  },
  {
    id: "premium",
    label: "Premium Escape",
    range: "₹8,000 – ₹15,000",
    min: 8000,
    max: 15000,
    emoji: "💎",
    tagline: "Curated luxury experiences",
    examples: ["Manali", "Jaipur", "Munnar"],
    duration: "4–6 days",
  },
  {
    id: "weekend",
    label: "Quick Weekend",
    range: "Under ₹4,000",
    min: 0,
    max: 4000,
    emoji: "⚡",
    tagline: "48-hour spontaneous trips",
    examples: ["Lonavala", "Nandi Hills", "Alibaug"],
    duration: "1–2 days",
  },
];

interface OnboardingState {
  flowStep: FlowStep;
  selectedTier: BudgetTier | null;
  selectedDestination: string | null;
  userLocation: UserLocation | null;
  duration: number; // trip days
  discoveredDestinations: DiscoveredDestination[];
  isLoadingDestinations: boolean;
  /** Itinerary data generated before entering planner */
  generatedItinerary: any | null;
  isGeneratingItinerary: boolean;

  setFlowStep: (step: FlowStep) => void;
  selectTier: (tier: BudgetTier) => void;
  selectDestination: (destination: string) => void;
  setUserLocation: (location: UserLocation) => void;
  setDuration: (days: number) => void;
  setDiscoveredDestinations: (destinations: DiscoveredDestination[]) => void;
  setLoadingDestinations: (loading: boolean) => void;
  setGeneratedItinerary: (data: any | null) => void;
  setGeneratingItinerary: (loading: boolean) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  flowStep: "landing",
  selectedTier: null,
  selectedDestination: null,
  userLocation: null,
  duration: 3,
  discoveredDestinations: [],
  isLoadingDestinations: false,
  generatedItinerary: null,
  isGeneratingItinerary: false,

  setFlowStep: (step) => set({ flowStep: step }),

  selectTier: (tier) =>
    set({ selectedTier: tier, flowStep: "trip-inputs" }),

  selectDestination: (destination) =>
    set({ selectedDestination: destination, flowStep: "planner" }),

  setUserLocation: (location) => set({ userLocation: location }),

  setDuration: (days) => set({ duration: days }),

  setDiscoveredDestinations: (destinations) =>
    set({ discoveredDestinations: destinations }),

  setLoadingDestinations: (loading) =>
    set({ isLoadingDestinations: loading }),

  setGeneratedItinerary: (data) => set({ generatedItinerary: data }),

  setGeneratingItinerary: (loading) => set({ isGeneratingItinerary: loading }),

  reset: () =>
    set({
      flowStep: "landing",
      selectedTier: null,
      selectedDestination: null,
      userLocation: null,
      duration: 3,
      discoveredDestinations: [],
      isLoadingDestinations: false,
      generatedItinerary: null,
      isGeneratingItinerary: false,
    }),
}));

