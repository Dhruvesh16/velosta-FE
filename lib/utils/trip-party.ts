import type { TripData } from "@/lib/types/planner.types";

/** Maps onboarding party picker into planner `tripData` fields used by PDFs. */
export function tripPartyMeta(
  travelerType: string | undefined,
  travelerCount: number | undefined
): Pick<TripData, "travelers" | "travelType" | "travelerCount"> {
  const nRaw = travelerCount ?? 1;
  const n = Number.isFinite(nRaw) ? Math.max(1, Math.floor(nRaw)) : 1;
  return {
    travelers: { adults: n, children: 0 },
    travelerCount: n,
    ...(travelerType ? { travelType: travelerType } : {}),
  };
}

/** Total travelers from structured fields, excluding invalid / empty payloads. */
export function tripTravelerHeadcount(td: TripData): number | undefined {
  const t = td.travelers;
  if (!t) return undefined;
  const adults = Math.max(0, Math.floor(Number(t.adults) || 0));
  const children = Math.max(0, Math.floor(Number(t.children) || 0));
  const total = adults + children;
  return total > 0 ? total : undefined;
}

/**
 * Prefer explicit `travelers`; if missing or looks like stale default-only `1`,
 * fill from onboarding traveler count when exporting/sharing PDFs (session truth).
 */
export function mergeTripDataForExport(td: TripData, onboardingTravelerCount?: number): TripData {
  const h = tripTravelerHeadcount(td);
  const ob =
    onboardingTravelerCount != null && Number.isFinite(onboardingTravelerCount)
      ? Math.max(1, Math.floor(onboardingTravelerCount))
      : undefined;

  if (ob === undefined) {
    const raw = td.travelerCount;
    if (raw != null && Number.isFinite(raw) && h === undefined) {
      const n = Math.max(1, Math.floor(raw));
      return { ...td, travelers: { adults: n, children: 0 }, travelerCount: n };
    }
    if (h !== undefined && (td.travelerCount === undefined || td.travelerCount === null)) {
      return { ...td, travelerCount: h };
    }
    return td;
  }

  if (h === undefined) {
    return { ...td, travelers: { adults: ob, children: 0 }, travelerCount: ob };
  }

  const childrenOnly = (td.travelers?.children ?? 0) > 0;
  // Likely hydration bug / old client: planner has default 1 adult but onboarding still has real party size
  if (!childrenOnly && h === 1 && ob > 1) {
    return { ...td, travelers: { adults: ob, children: 0 }, travelerCount: ob };
  }

  return td.travelerCount != null ? td : { ...td, travelerCount: h };
}
