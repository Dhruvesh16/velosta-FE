import { authApi } from "@/lib/api";
import type { TravelProfileAnswers } from "@/lib/stores/onboarding-store";

const PENDING_SYNC_KEY = "velosta:travel-profile-pending-sync";

export function markTravelProfilePendingSync(profile: TravelProfileAnswers) {
  try {
    window.localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage write failures.
  }
}

export function clearTravelProfilePendingSync() {
  try {
    window.localStorage.removeItem(PENDING_SYNC_KEY);
  } catch {
    // Ignore storage remove failures.
  }
}

export function readTravelProfilePendingSync(): TravelProfileAnswers | null {
  try {
    const raw = window.localStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TravelProfileAnswers;
  } catch {
    return null;
  }
}

export async function syncTravelProfileToServer(
  profile: TravelProfileAnswers
): Promise<boolean> {
  try {
    await authApi.updateProfile({ travel_preferences: profile });
    clearTravelProfilePendingSync();
    return true;
  } catch {
    markTravelProfilePendingSync(profile);
    return false;
  }
}

