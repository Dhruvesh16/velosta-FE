// ── Velosta AI Spatial Planner — Core Types ──────────────────────────────────

export interface ActivityRow {
  id: string;
  time: string;
  activity: string;
  description: string;
  distance: string;
  pricing: string;
  /** Optional: [longitude, latitude] resolved by geocoding */
  coordinates?: [number, number];
}

/** Raw activity as returned by the AI (id is optional until normalized) */
export interface RawActivityRow extends Omit<ActivityRow, "id"> {
  id?: string;
}

export interface DayMeals {
  breakfast?: string;
  lunch?: string;
  dinner?: string;
}

/** Enriched itinerary day used internally (always has id, fatigue scores, etc.) */
export interface ItineraryDay {
  id: string;
  day: number;
  theme: string;
  dailyCost: string;
  rows: ActivityRow[];
  meals?: DayMeals;
  accommodation?: string;
  /** Computed by fatigue algorithm */
  fatigueScore?: number;
  fatigueLabel?: FatigueLabel;
  /** Central coordinate for this day (derived from activities) */
  coordinates?: [number, number];
}

/** Raw day as returned by the AI (id is optional until normalized) */
export interface RawItineraryDay extends Omit<ItineraryDay, "id" | "rows"> {
  id?: string;
  rows?: RawActivityRow[];
}

export type FatigueLabel = "Light" | "Moderate" | "Intense" | "Exhausting";

export interface BudgetBreakdown {
  accommodation?: string;
  food?: string;
  transportation?: string;
  activities?: string;
  miscellaneous?: string;
  [key: string]: string | undefined;
}

export interface ExpenseSummary {
  perPersonBreakdown?: Record<string, { amount: string; details: string[] }>;
  totalPerPerson?: string;
  totalForGroup?: string;
  costSavingTips?: string[];
}

export interface Suggestion {
  replaces: string;
  alternative: string;
  reason: string;
  savingsEstimate?: string;
}

export interface ItineraryData {
  destination: string;
  duration: string;
  summary?: string;
  budgetBreakdown?: BudgetBreakdown;
  /** Raw days as returned by AI — normalized to ItineraryDay[] in the store */
  itineraryTable: RawItineraryDay[];
  expenseSummary?: ExpenseSummary;
  localTips?: string[];
  totalEstimatedCost?: string;
  totalBudget?: string;
  suggestions?: Suggestion[];
}

export interface TripData {
  destination?: string;
  travelType?: string;
  dateRange?: { start: string; end: string };
  travelers?: { adults: number; children: number };
  /** Cached headcount when party was chosen in onboarding — used if `travelers` is missing */
  travelerCount?: number;
  budget?: string;
  travelVibe?: string[];
  mustVisitPlaces?: string[];
  preferences?: Record<string, string[]>;
  accommodation?: string;
  specialRequests?: string;
}

export interface MapMarker {
  id: string;
  coordinates: [number, number];
  label: string;
  dayIndex: number;
  activityIndex: number;
  pricing?: string;
  time?: string;
  type: "activity" | "stay" | "meal";
}

export interface MapViewport {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

// ── Feasibility Score Types ───────────────────────────────────────────────────

export type FeasibilityGrade = "A" | "B" | "C" | "D" | "F";

export interface FeasibilityResult {
  score: number;           // 0–100
  grade: FeasibilityGrade;
  budgetDelta: number;     // positive = under budget, negative = over
  label: string;
  color: string;           // CSS color token
  warnings: string[];
}

// ── Fatigue Score Types ───────────────────────────────────────────────────────

export interface FatigueResult {
  score: number;     // 0–10
  label: FatigueLabel;
  color: string;
}



