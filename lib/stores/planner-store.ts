// ── Planner Store — Zustand ───────────────────────────────────────────────────
// Master state for the itinerary, trip data and budget tracking

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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

function toNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toLngLat(a: number, b: number): [number, number] | null {
  // Canonical [lng, lat]
  if (a >= -180 && a <= 180 && b >= -90 && b <= 90) return [a, b];
  // [lat, lng] → swap
  if (a >= -90 && a <= 90 && b >= -180 && b <= 180) return [b, a];
  return null;
}

/** Robustly parse row coordinates from multiple LLM output shapes. */
function parseRowCoordinates(rawRow: any): [number, number] | undefined {
  const rawCoords = rawRow.coordinates;

  // 1) coordinates as [x, y]
  if (Array.isArray(rawCoords) && rawCoords.length >= 2) {
    const a = toNum(rawCoords[0]);
    const b = toNum(rawCoords[1]);
    if (a != null && b != null) {
      const ll = toLngLat(a, b);
      if (ll) return ll;
    }
  }

  // 2) coordinates as object {lat,lng} / {latitude,longitude} / {lon,lat}
  if (rawCoords && typeof rawCoords === "object") {
    const c = rawCoords as Record<string, unknown>;
    const lat = toNum(c.lat ?? c.latitude);
    const lng = toNum(c.lng ?? c.lon ?? c.long ?? c.longitude);
    if (lat != null && lng != null) {
      const ll = toLngLat(lng, lat);
      if (ll) return ll;
    }
  }

  // 3) top-level row fields
  const lat = toNum(rawRow.lat ?? rawRow.latitude);
  const lng = toNum(rawRow.lng ?? rawRow.lon ?? rawRow.long ?? rawRow.longitude);
  if (lat != null && lng != null) {
    const ll = toLngLat(lng, lat);
    if (ll) return ll;
  }

  return undefined;
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
      const rawRow = row as any;
      const coordinates = parseRowCoordinates(rawRow);

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

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
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
    }),
    {
      name: "velosta-planner",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        itineraryData: state.itineraryData,
        itinerary: state.itinerary,
        tripData: state.tripData,
        activeDay: state.activeDay,
        totalBudget: state.totalBudget,
        spentBudget: state.spentBudget,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state?.itineraryData) return;
        const normalized = (state.itineraryData.itineraryTable ?? []).map(normalizeDay);
        const enriched = enrichItineraryWithFatigue(normalized);
        state.itinerary = enriched;
        state.spentBudget = recalcSpent(enriched);
      },
    }
  )
);



