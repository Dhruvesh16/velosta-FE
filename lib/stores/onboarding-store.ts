// ── Onboarding Store — Zustand ────────────────────────────────────────────────
// Controls the entry flow: landing → budget → trip-inputs → explore → planner

import { create } from "zustand";

export type FlowStep = "landing" | "budget" | "packages" | "trip-inputs" | "explore" | "planner";

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

// ── Travel Packages ───────────────────────────────────────────────────────────

export interface TravelPackage {
  id: string;
  name: string;
  destination: string;
  coordinates: [number, number]; // [lng, lat]
  days: number;
  cost: number;
  costLabel: string;
  image: string;
  highlights: string[];
  itineraryPoints: { name: string; coordinates: [number, number]; type: "stay" | "activity" | "food" | "scenic" }[];
  tierId: string; // which budget tier(s) this fits
}

export const TRAVEL_PACKAGES: TravelPackage[] = [
  // Budget tier
  {
    id: "pkg-pondicherry-budget",
    name: "French Quarter Vibes",
    destination: "Pondicherry",
    coordinates: [79.8306, 11.9344],
    days: 2,
    cost: 3500,
    costLabel: "₹3,500",
    image: "🏖️",
    highlights: ["Promenade Beach", "Auroville", "French Colony Walk", "Café culture"],
    itineraryPoints: [
      { name: "Promenade Beach", coordinates: [79.8425, 11.9331], type: "scenic" },
      { name: "Auroville Matrimandir", coordinates: [79.8107, 12.0060], type: "activity" },
      { name: "Café des Arts", coordinates: [79.8359, 11.9329], type: "food" },
      { name: "Paradise Beach", coordinates: [79.8369, 11.8880], type: "scenic" },
    ],
    tierId: "budget",
  },
  {
    id: "pkg-hampi-budget",
    name: "Ruins & Boulders",
    destination: "Hampi",
    coordinates: [76.4601, 15.3350],
    days: 3,
    cost: 4500,
    costLabel: "₹4,500",
    image: "🏛️",
    highlights: ["Virupaksha Temple", "Hippie Island", "Sunset Point", "Coracle ride"],
    itineraryPoints: [
      { name: "Virupaksha Temple", coordinates: [76.4599, 15.3350], type: "activity" },
      { name: "Hippie Island", coordinates: [76.4440, 15.3486], type: "scenic" },
      { name: "Matanga Hill Sunrise", coordinates: [76.4636, 15.3387], type: "scenic" },
      { name: "Mango Tree Restaurant", coordinates: [76.4605, 15.3352], type: "food" },
    ],
    tierId: "budget",
  },
  {
    id: "pkg-rishikesh-budget",
    name: "River & Mountains",
    destination: "Rishikesh",
    coordinates: [78.2676, 30.0869],
    days: 3,
    cost: 4000,
    costLabel: "₹4,000",
    image: "🏔️",
    highlights: ["Laxman Jhula", "River Rafting", "Beatles Ashram", "Ganga Aarti"],
    itineraryPoints: [
      { name: "Laxman Jhula", coordinates: [78.3213, 30.1256], type: "scenic" },
      { name: "River Rafting – Shivpuri", coordinates: [78.3844, 30.1467], type: "activity" },
      { name: "Beatles Ashram", coordinates: [78.3132, 30.1098], type: "activity" },
      { name: "Triveni Ghat Aarti", coordinates: [78.2682, 30.0872], type: "scenic" },
    ],
    tierId: "budget",
  },
  // Mid tier
  {
    id: "pkg-goa-mid",
    name: "Sun, Sand & Spice",
    destination: "Goa",
    coordinates: [73.7515, 15.5000],
    days: 4,
    cost: 7000,
    costLabel: "₹7,000",
    image: "🌴",
    highlights: ["Baga Beach", "Old Goa Churches", "Dudhsagar Falls", "Night Market"],
    itineraryPoints: [
      { name: "Baga Beach", coordinates: [73.7516, 15.5553], type: "scenic" },
      { name: "Basilica of Bom Jesus", coordinates: [73.9117, 15.5008], type: "activity" },
      { name: "Dudhsagar Falls", coordinates: [74.3142, 15.3143], type: "scenic" },
      { name: "Saturday Night Market – Arpora", coordinates: [73.7619, 15.5640], type: "food" },
    ],
    tierId: "mid",
  },
  {
    id: "pkg-udaipur-mid",
    name: "City of Lakes",
    destination: "Udaipur",
    coordinates: [73.6833, 24.5764],
    days: 3,
    cost: 6500,
    costLabel: "₹6,500",
    image: "🏰",
    highlights: ["Lake Pichola", "City Palace", "Sunset boat ride", "Rooftop dining"],
    itineraryPoints: [
      { name: "City Palace Museum", coordinates: [73.6844, 24.5797], type: "activity" },
      { name: "Lake Pichola – Rameshwar Ghat", coordinates: [73.6787, 24.5720], type: "scenic" },
      { name: "Jagdish Temple", coordinates: [73.6843, 24.5784], type: "activity" },
      { name: "Ambrai Ghat Restaurant", coordinates: [73.6813, 24.5754], type: "food" },
    ],
    tierId: "mid",
  },
  {
    id: "pkg-kodaikanal-mid",
    name: "Misty Hills Retreat",
    destination: "Kodaikanal",
    coordinates: [77.4892, 10.2381],
    days: 3,
    cost: 5500,
    costLabel: "₹5,500",
    image: "🌿",
    highlights: ["Coaker's Walk", "Pine Forest", "Dolphin's Nose", "Homemade chocolate"],
    itineraryPoints: [
      { name: "Coaker's Walk", coordinates: [77.4950, 10.2297], type: "scenic" },
      { name: "Pine Forest", coordinates: [77.4715, 10.2265], type: "activity" },
      { name: "Dolphin's Nose", coordinates: [77.4699, 10.2170], type: "scenic" },
      { name: "Kodaikanal Lake", coordinates: [77.4893, 10.2337], type: "scenic" },
    ],
    tierId: "mid",
  },
  // Premium tier
  {
    id: "pkg-manali-premium",
    name: "Mountain Luxury",
    destination: "Manali",
    coordinates: [77.1887, 32.2396],
    days: 5,
    cost: 12000,
    costLabel: "₹12,000",
    image: "🏔️",
    highlights: ["Solang Valley", "Rohtang Pass", "Old Manali", "River crossing"],
    itineraryPoints: [
      { name: "Solang Valley", coordinates: [77.1543, 32.3151], type: "activity" },
      { name: "Rohtang Pass", coordinates: [77.2487, 32.3724], type: "scenic" },
      { name: "Hadimba Devi Temple", coordinates: [77.1693, 32.2432], type: "activity" },
      { name: "Old Manali Cafés", coordinates: [77.1885, 32.2549], type: "food" },
    ],
    tierId: "premium",
  },
  {
    id: "pkg-jaipur-premium",
    name: "Royal Rajasthan",
    destination: "Jaipur",
    coordinates: [75.7873, 26.9124],
    days: 4,
    cost: 10000,
    costLabel: "₹10,000",
    image: "👑",
    highlights: ["Amber Fort", "Hawa Mahal", "Nahargarh Sunset", "Thali feast"],
    itineraryPoints: [
      { name: "Amer Fort", coordinates: [75.8513, 26.9855], type: "activity" },
      { name: "Hawa Mahal", coordinates: [75.8267, 26.9239], type: "activity" },
      { name: "Nahargarh Fort", coordinates: [75.8152, 26.9386], type: "scenic" },
      { name: "Chokhi Dhani Village", coordinates: [75.7831, 26.7959], type: "food" },
    ],
    tierId: "premium",
  },
  {
    id: "pkg-munnar-premium",
    name: "Tea Garden Paradise",
    destination: "Munnar",
    coordinates: [77.0595, 10.0889],
    days: 4,
    cost: 9000,
    costLabel: "₹9,000",
    image: "🍃",
    highlights: ["Tea plantations", "Eravikulam NP", "Mattupetty Dam", "Spice tour"],
    itineraryPoints: [
      { name: "Kolukkumalai Tea Estate", coordinates: [77.1361, 10.0555], type: "activity" },
      { name: "Eravikulam National Park", coordinates: [77.0610, 10.1839], type: "scenic" },
      { name: "Mattupetty Dam", coordinates: [77.1275, 10.1119], type: "scenic" },
      { name: "Munnar Spice Garden", coordinates: [77.0617, 10.0793], type: "activity" },
    ],
    tierId: "premium",
  },
  // Weekend tier
  {
    id: "pkg-lonavala-weekend",
    name: "Quick Hill Escape",
    destination: "Lonavala",
    coordinates: [73.4073, 18.7546],
    days: 2,
    cost: 3000,
    costLabel: "₹3,000",
    image: "⛰️",
    highlights: ["Tiger's Leap", "Bhushi Dam", "Karla Caves", "Chikki shops"],
    itineraryPoints: [
      { name: "Tiger's Leap", coordinates: [73.3753, 18.7277], type: "scenic" },
      { name: "Bhushi Dam", coordinates: [73.4780, 18.7510], type: "activity" },
      { name: "Karla Caves", coordinates: [73.4724, 18.7813], type: "activity" },
      { name: "Lonavala Market", coordinates: [73.4052, 18.7530], type: "food" },
    ],
    tierId: "weekend",
  },
  {
    id: "pkg-nandihills-weekend",
    name: "Sunrise Sprint",
    destination: "Nandi Hills",
    coordinates: [77.6835, 13.3702],
    days: 1,
    cost: 2000,
    costLabel: "₹2,000",
    image: "🌅",
    highlights: ["Sunrise viewpoint", "Tipu's Drop", "Yoga Garden", "Local breakfast"],
    itineraryPoints: [
      { name: "Sunrise Viewpoint", coordinates: [77.6837, 13.3705], type: "scenic" },
      { name: "Tipu Sultan's Drop", coordinates: [77.6818, 13.3714], type: "scenic" },
      { name: "Amrita Sarovar", coordinates: [77.6843, 13.3688], type: "activity" },
      { name: "Brahmashram", coordinates: [77.6829, 13.3700], type: "activity" },
    ],
    tierId: "weekend",
  },
  {
    id: "pkg-alibaug-weekend",
    name: "Coastal Getaway",
    destination: "Alibaug",
    coordinates: [72.8726, 18.6414],
    days: 2,
    cost: 3500,
    costLabel: "₹3,500",
    image: "🏝️",
    highlights: ["Alibaug Beach", "Kolaba Fort", "Water sports", "Seafood feast"],
    itineraryPoints: [
      { name: "Alibaug Beach", coordinates: [72.8710, 18.6406], type: "scenic" },
      { name: "Kolaba Fort", coordinates: [72.8682, 18.6259], type: "activity" },
      { name: "Kashid Beach", coordinates: [73.0127, 18.4462], type: "scenic" },
      { name: "Sanman Seafood", coordinates: [72.8753, 18.6431], type: "food" },
    ],
    tierId: "weekend",
  },
];

interface OnboardingState {
  flowStep: FlowStep;
  selectedTier: BudgetTier | null;
  selectedPackage: TravelPackage | null;
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
  selectPackage: (pkg: TravelPackage) => void;
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
  selectedPackage: null,
  selectedDestination: null,
  userLocation: null,
  duration: 3,
  discoveredDestinations: [],
  isLoadingDestinations: false,
  generatedItinerary: null,
  isGeneratingItinerary: false,

  setFlowStep: (step) => set({ flowStep: step }),

  selectTier: (tier) =>
    set({ selectedTier: tier, flowStep: "packages" }),

  selectPackage: (pkg) =>
    set({
      selectedPackage: pkg,
      selectedDestination: pkg.destination,
      duration: pkg.days,
      flowStep: "explore",
    }),

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
      selectedPackage: null,
      selectedDestination: null,
      userLocation: null,
      duration: 3,
      discoveredDestinations: [],
      isLoadingDestinations: false,
      generatedItinerary: null,
      isGeneratingItinerary: false,
    }),
}));

