// ── Feasibility Score Algorithm ───────────────────────────────────────────────
// Scores how well the itinerary fits the trip constraints (0–100)

import type {
  FeasibilityResult,
  FeasibilityGrade,
  ItineraryDay,
  TripData,
} from "@/lib/types/planner.types";

/** Haversine distance between two [lng, lat] points in kilometres */
function haversineKm(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number]
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Parse a cost string like "₹3,500" or "$120" → number */
function parseCost(str: string | undefined): number {
  if (!str) return 0;
  const cleaned = str.replace(/[₹$€£,\s]/g, "").match(/[\d.]+/);
  return cleaned ? parseFloat(cleaned[0]) : 0;
}

export function computeFeasibilityScore(
  itinerary: ItineraryDay[],
  tripData: TripData
): FeasibilityResult {
  const warnings: string[] = [];

  if (!itinerary || itinerary.length === 0) {
    return {
      score: 0,
      grade: "F",
      budgetDelta: 0,
      label: "No itinerary",
      color: "var(--sp-score-bad)",
      warnings: ["No itinerary data available"],
    };
  }

  // ── 1. Budget Adherence (35%) ────────────────────────────────────────────
  const totalBudget = parseCost(tripData.budget);
  const totalSpent = itinerary.reduce((sum, day) => sum + parseCost(day.dailyCost), 0);
  let budgetScore: number;
  let budgetDelta = totalBudget - totalSpent;

  if (totalBudget > 0) {
    const ratio = totalSpent / totalBudget;
    if (ratio <= 1) {
      budgetScore = 100;
    } else if (ratio <= 1.15) {
      budgetScore = 75;
      warnings.push("Trip slightly exceeds your stated budget");
    } else if (ratio <= 1.3) {
      budgetScore = 50;
      warnings.push("Trip is ~30% over your budget");
    } else {
      budgetScore = Math.max(0, 100 - (ratio - 1) * 200);
      warnings.push("Trip significantly exceeds your budget");
    }
  } else {
    budgetScore = 70; // no budget stated — neutral
    budgetDelta = 0;
  }

  // ── 2. Activity Density (30%) ────────────────────────────────────────────
  const avgActivitiesPerDay =
    itinerary.reduce((sum, day) => sum + (day.rows?.length ?? 0), 0) /
    itinerary.length;

  let densityScore = 100;
  if (avgActivitiesPerDay < 2) {
    densityScore = 60;
    warnings.push("Very few activities per day — itinerary may feel sparse");
  } else if (avgActivitiesPerDay > 7) {
    densityScore = 55;
    warnings.push("Too many activities per day — consider spreading them out");
  } else if (avgActivitiesPerDay > 6) {
    densityScore = 80;
  }

  // ── 3. Geographic Cohesion (20%) ─────────────────────────────────────────
  let geoScore = 85; // default when no coords available
  const daysWithCoords = itinerary.filter(
    (day) => day.rows?.some((r) => r.coordinates)
  );

  if (daysWithCoords.length > 0) {
    const avgKmPerDay = daysWithCoords.reduce((daySum, day) => {
      const coords = day.rows
        .filter((r) => r.coordinates)
        .map((r) => r.coordinates as [number, number]);

      if (coords.length < 2) return daySum;

      let totalKm = 0;
      for (let i = 1; i < coords.length; i++) {
        totalKm += haversineKm(coords[i - 1], coords[i]);
      }
      return daySum + totalKm / (coords.length - 1);
    }, 0) / daysWithCoords.length;

    if (avgKmPerDay > 30) {
      geoScore = 50;
      warnings.push("Activities are very spread out — expect long travel days");
    } else if (avgKmPerDay > 15) {
      geoScore = 70;
    } else {
      geoScore = 100;
    }
  }

  // ── 4. Must-Visit Coverage (15%) ─────────────────────────────────────────
  const mustVisit = tripData.mustVisitPlaces ?? [];
  let coverageScore = 100;

  if (mustVisit.length > 0) {
    const allActivities = itinerary
      .flatMap((d) => d.rows)
      .map((r) => (r.activity + " " + r.description).toLowerCase());

    const covered = mustVisit.filter((place) =>
      allActivities.some((act) => act.includes(place.toLowerCase()))
    ).length;

    coverageScore = (covered / mustVisit.length) * 100;
    if (coverageScore < 100) {
      const missing = mustVisit.filter(
        (place) =>
          !allActivities.some((act) => act.includes(place.toLowerCase()))
      );
      warnings.push(`Missing must-visit places: ${missing.join(", ")}`);
    }
  }

  // ── Weighted Final Score ──────────────────────────────────────────────────
  const score = Math.round(
    budgetScore * 0.35 +
      densityScore * 0.30 +
      geoScore * 0.20 +
      coverageScore * 0.15
  );

  const grade: FeasibilityGrade =
    score >= 85 ? "A" :
    score >= 70 ? "B" :
    score >= 55 ? "C" :
    score >= 40 ? "D" : "F";

  const label =
    grade === "A" ? "Excellent Match" :
    grade === "B" ? "Good Match" :
    grade === "C" ? "Tight Fit" :
    grade === "D" ? "Difficult" : "Unrealistic";

  const color =
    grade === "A" ? "var(--sp-score-good)" :
    grade === "B" ? "var(--sp-score-warn)" :
    grade === "C" ? "var(--sp-score-risk)" : "var(--sp-score-bad)";

  return { score, grade, budgetDelta, label, color, warnings };
}


