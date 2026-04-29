import { api } from "@/lib/api";

export interface SavedTripRecord {
  id: string;
  title?: string | null;
  tripSnapshot?: Record<string, unknown> | null;
  createdAt: string;
}

export interface SharedTripRecord {
  id: string;
  shareToken: string;
  title: string;
  tripSnapshot: Record<string, unknown>;
  createdAt: string;
}

export async function saveTripSnapshot(title: string, tripSnapshot: Record<string, unknown>) {
  return api.post<{ savedTrip: SavedTripRecord }>("/api/trips/saved-trips", {
    title,
    tripSnapshot,
  });
}

export async function listSavedTrips() {
  return api.get<{ savedTrips: SavedTripRecord[] }>("/api/trips/saved-trips");
}

export async function createSharedTrip(title: string, tripSnapshot: Record<string, unknown>) {
  return api.post<{ sharedTrip: SharedTripRecord }>("/api/trips/shared-trips", {
    title,
    tripSnapshot,
  });
}

export async function getSharedTrip(token: string) {
  return api.get<{ sharedTrip: SharedTripRecord }>(`/api/trips/shared-trips/${encodeURIComponent(token)}`);
}

export async function sendExpenseInviteEmail(input: {
  email: string;
  recipientName: string;
  inviterName: string;
  tripName: string;
  joinUrl: string;
}) {
  return api.post<{ queued: boolean }>("/api/trips/expense/invite", input);
}

export async function sendTripClosedEmails(input: {
  tripName: string;
  totalSpent: string;
  settlementSummary: string;
  members: Array<{
    email: string;
    name: string;
    personalBalance: string;
  }>;
}) {
  return api.post<{ sent: number; total: number }>("/api/trips/expense/close-trip", input);
}

export async function sendTripStartedEmail(input: {
  email: string;
  name: string;
  tripName: string;
}) {
  return api.post<{ queued: boolean }>("/api/trips/expense/trip-started", input);
}

