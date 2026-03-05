// ── Fatigue Score Algorithm ───────────────────────────────────────────────────
// Computes a per-day fatigue score (0–10) based on activity density & intensity

import type { FatigueResult, FatigueLabel, ItineraryDay } from "@/lib/types/planner.types";

const INTENSE_KEYWORDS = [
  "hike", "trek", "climb", "trail", "walk", "tour", "cycling", "biking",
  "kayak", "rafting", "surfing", "snorkel", "dive", "swimming", "safari",
  "trekking", "paragliding", "ziplining",
];

const RELAXING_KEYWORDS = [
  "spa", "resort", "beach", "relax", "lounge", "sunset", "brunch",
  "meditation", "retreat", "pool", "hammam", "massage",
];

function parseDistanceKm(dist: string | undefined): number {
  if (!dist) return 0;
  const match = dist.match(/(\d+(\.\d+)?)\s*(km|kilometers?)/i);
  if (match) return parseFloat(match[1]);
  const miles = dist.match(/(\d+(\.\d+)?)\s*(mi|miles?)/i);
  if (miles) return parseFloat(miles[1]) * 1.60934;
  return 0;
}

export function computeDayFatigue(day: ItineraryDay): FatigueResult {
  let score = 0;

  const rows = day.rows ?? [];

  // Base: each activity adds 1.2 points
  score += rows.length * 1.2;

  // Long-distance travel penalty
  rows.forEach((row) => {
    const km = parseDistanceKm(row.distance);
    if (km > 10) score += 1.5;
    else if (km > 5) score += 0.5;
  });

  // Full-day meal schedule
  const meals = day.meals;
  if (meals?.breakfast && meals?.lunch && meals?.dinner) {
    score += 1.0;
  }

  // Intensity keyword scan
  rows.forEach((row) => {
    const text = (row.activity + " " + row.description).toLowerCase();
    const intensityMatches = INTENSE_KEYWORDS.filter((k) => text.includes(k)).length;
    score += intensityMatches * 0.5;
  });

  // Relaxation reduction from accommodation
  const accText = (day.accommodation ?? "").toLowerCase();
  const relaxMatches = RELAXING_KEYWORDS.filter((k) => accText.includes(k)).length;
  score -= relaxMatches * 0.5;

  // Clamp to 0–10
  score = Math.max(0, Math.min(10, score));

  const label: FatigueLabel =
    score <= 3  ? "Light" :
    score <= 5.5 ? "Moderate" :
    score <= 7.5 ? "Intense" : "Exhausting";

  const color =
    label === "Light"     ? "var(--sp-score-good)" :
    label === "Moderate"  ? "var(--sp-score-warn)" :
    label === "Intense"   ? "var(--sp-score-risk)" : "var(--sp-score-bad)";

  return { score, label, color };
}

/** Compute fatigue for all days and return labelled itinerary */
export function enrichItineraryWithFatigue(
  days: ItineraryDay[]
): ItineraryDay[] {
  return days.map((day) => {
    const { score, label } = computeDayFatigue(day);
    return { ...day, fatigueScore: score, fatigueLabel: label };
  });
}

