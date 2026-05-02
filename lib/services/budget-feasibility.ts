"use client";

const INTERNATIONAL_HINTS = [
  "japan",
  "tokyo",
  "kyoto",
  "osaka",
  "france",
  "paris",
  "italy",
  "rome",
  "spain",
  "london",
  "uk",
  "usa",
  "new york",
  "singapore",
  "thailand",
  "bali",
  "maldives",
  "dubai",
  "europe",
];

const PREMIUM_INDIA_HINTS = [
  "manali",
  "leh",
  "ladakh",
  "andaman",
  "lakshadweep",
  "kashmir",
  "sikkim",
];

function _looksInternational(destination: string): boolean {
  const d = destination.toLowerCase();
  return INTERNATIONAL_HINTS.some((hint) => d.includes(hint));
}

function _looksPremiumDomestic(destination: string): boolean {
  const d = destination.toLowerCase();
  return PREMIUM_INDIA_HINTS.some((hint) => d.includes(hint));
}

export function estimateRealisticMinBudgetPerPerson(
  destination: string,
  days: number
): number {
  const safeDays = Math.max(1, days);
  if (_looksInternational(destination)) {
    return Math.max(35000, safeDays * 12000);
  }
  if (_looksPremiumDomestic(destination)) {
    return Math.max(9000, safeDays * 3200);
  }
  return Math.max(5000, safeDays * 2200);
}

export function buildBudgetRealityMessage(params: {
  destination: string;
  days: number;
  currentBudgetPerPerson: number;
}) {
  const minBudget = estimateRealisticMinBudgetPerPerson(
    params.destination,
    params.days
  );
  const budget = Math.max(0, Math.round(params.currentBudgetPerPerson));
  if (budget >= minBudget) return null;

  const suggested = Math.ceil(minBudget / 500) * 500;
  return {
    minBudget,
    suggestedBudget: suggested,
    message:
      `₹${budget.toLocaleString("en-IN")} per person is too low for ${params.destination} ` +
      `(${params.days} ${params.days === 1 ? "day" : "days"}). ` +
      `A realistic start is about ₹${suggested.toLocaleString("en-IN")} per person. ` +
      "Increase budget or choose nearby budget-friendly destinations.",
  };
}
