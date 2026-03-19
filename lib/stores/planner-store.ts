// ── Planner Store — Zustand ───────────────────────────────────────────────────
// Master state for the itinerary, trip data and budget tracking

import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  ItineraryDay,
  ItineraryData,
  TripData,
  ActivityRow,
  RawItineraryDay,
} from "@/lib/types/planner.types";
import { enrichItineraryWithFatigue } from "@/lib/algorithms/fatigue-score";

/** Parse "₹3,500" / "$120" → number */
function parseCostNum(s: string | undefined): number {
  if (!s) return 0;
  const m = s.replace(/[₹$€£,\s]/g, "").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

interface PlannerState {
  /** Raw itinerary data from AI */
  itineraryData: ItineraryData | null;
  /** Processed, enriched day list (with ids, fatigue scores) */
  itinerary: ItineraryDay[];
  /** Trip metadata from the Q&A flow */
  tripData: TripData;
  /** Index of the day currently focused on the map */
  activeDay: number;
  /** Computed total budget (numeric) */
  totalBudget: number;
  /** Computed total spent (numeric, sum of day costs) */
  spentBudget: number;

  // ── Actions ─────────────────────────────────────────────────────────────
  /** Called when AI returns a new itinerary */
  setItineraryData: (data: ItineraryData, tripData: TripData) => void;
  setTripData: (tripData: TripData) => void;
  setActiveDay: (dayIndex: number) => void;
  /** Reorder days */
  reorderDays: (fromIndex: number, toIndex: number) => void;
  /** Reorder activities within a specific day */
  reorderActivities: (dayIndex: number, fromIndex: number, toIndex: number) => void;
  /** Patch a single activity field */
  patchActivity: (
    dayIndex: number,
    activityIndex: number,
    patch: Partial<ActivityRow>
  ) => void;
  removeActivity: (dayIndex: number, activityIndex: number) => void;
  clearItinerary: () => void;
}

function normalizeDay(day: RawItineraryDay, index: number): ItineraryDay {
  return {
    ...day,
    id: day.id ?? `day-${day.day ?? index + 1}-${nanoid(4)}`,
    day: day.day ?? index + 1,
    theme: day.theme ?? "",
    dailyCost: day.dailyCost ?? "",
    rows: (day.rows ?? []).map((row) => {
      // Extract coordinates from LLM-provided lat/lng if present
      const rawRow = row as any;
      let coordinates: [number, number] | undefined = row.coordinates;
      if (!coordinates && rawRow.lat != null && rawRow.lng != null) {
        const lat = Number(rawRow.lat);
        const lng = Number(rawRow.lng);
        // Basic range validation only — distance validation happens in enrichItineraryWithCoordinates
        if (
          !isNaN(lat) && !isNaN(lng) &&
          lat >= 6 && lat <= 40 &&   // India lat range (rough)
          lng >= 65 && lng <= 100    // India lng range (rough)
        ) {
          coordinates = [lng, lat]; // Mapbox uses [lng, lat]
        }
      }

      return {
        ...row,
        id: row.id ?? nanoid(),
        time: row.time ?? "",
        activity: row.activity ?? "",
        description: row.description ?? "",
        distance: row.distance ?? "",
        pricing: row.pricing ?? "",
        coordinates,
      };
    }),
  };
}

function recalcSpent(days: ItineraryDay[]): number {
  return days.reduce((sum, d) => sum + parseCostNum(d.dailyCost), 0);
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  itineraryData: null,
  itinerary: [],
  tripData: {},
  activeDay: 0,
  totalBudget: 0,
  spentBudget: 0,

  setItineraryData: (data, tripData) => {
    const normalized = (data.itineraryTable ?? []).map(normalizeDay);
    const enriched = enrichItineraryWithFatigue(normalized);
    const budget = parseCostNum(tripData.budget ?? data.totalBudget);
    set({
      itineraryData: data,
      itinerary: enriched,
      tripData,
      totalBudget: budget,
      spentBudget: recalcSpent(enriched),
      activeDay: 0,
    });
  },

  setTripData: (tripData) => set({ tripData }),

  setActiveDay: (dayIndex) => set({ activeDay: dayIndex }),

  reorderDays: (fromIndex, toIndex) => {
    const { itinerary } = get();
    const reordered = arrayMove(itinerary, fromIndex, toIndex).map(
      (day, i) => ({ ...day, day: i + 1 })
    );
    const enriched = enrichItineraryWithFatigue(reordered);
    set({ itinerary: enriched });
  },

  reorderActivities: (dayIndex, fromIndex, toIndex) => {
    const { itinerary } = get();
    const updated = itinerary.map((day, i) => {
      if (i !== dayIndex) return day;
      return { ...day, rows: arrayMove(day.rows, fromIndex, toIndex) };
    });
    set({ itinerary: enrichItineraryWithFatigue(updated) });
  },

  patchActivity: (dayIndex, activityIndex, patch) => {
    const { itinerary } = get();
    const updated = itinerary.map((day, i) => {
      if (i !== dayIndex) return day;
      const rows = day.rows.map((row, j) =>
        j === activityIndex ? { ...row, ...patch } : row
      );
      return { ...day, rows };
    });
    set({
      itinerary: enrichItineraryWithFatigue(updated),
      spentBudget: recalcSpent(updated),
    });
  },

  removeActivity: (dayIndex, activityIndex) => {
    const { itinerary } = get();
    const updated = itinerary.map((day, i) => {
      if (i !== dayIndex) return day;
      return { ...day, rows: day.rows.filter((_, j) => j !== activityIndex) };
    });
    set({
      itinerary: enrichItineraryWithFatigue(updated),
      spentBudget: recalcSpent(updated),
    });
  },

  clearItinerary: () =>
    set({
      itineraryData: null,
      itinerary: [],
      tripData: {},
      activeDay: 0,
      totalBudget: 0,
      spentBudget: 0,
    }),
}));



