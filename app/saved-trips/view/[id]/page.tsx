"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@/app/utils/context";
import { listSavedTrips, type SavedTripRecord } from "@/lib/services/trips-service";
import SpatialPlannerShell from "@/components/velosta-ai/spatial-planner/spatial-planner-shell";
import { commitItineraryToStores, enrichItineraryInBackground } from "@/lib/services/itinerary-hydrator";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { useMapStore } from "@/lib/stores/map-store";

type SnapshotShape = {
  itineraryData?: Record<string, unknown>;
  tripData?: Record<string, unknown>;
  destination?: string;
  itineraryTable?: unknown[];
  totalEstimatedCost?: string;
  totalBudget?: string;
};

export default function SavedTripViewPage() {
  const params = useParams<{ id: string }>();
  const { accessToken, loading } = useUser();
  const itinerary = usePlannerStore((s) => s.itinerary);
  const [trip, setTrip] = useState<SavedTripRecord | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !params?.id) return;
    listSavedTrips()
      .then((d) => {
        const row = (d.savedTrips || []).find((x) => x.id === params.id) || null;
        setTrip(row);
      })
      .catch(() => {
        setTrip(null);
        setError("Could not load this saved trip.");
      });
  }, [accessToken, params?.id]);

  useEffect(() => {
    if (!trip) return;
    const raw = (trip.tripSnapshot ?? {}) as SnapshotShape;

    // Saved payload may be either { itineraryData, tripData } or raw itinerary object.
    const itineraryData = (raw.itineraryData ??
      (raw.itineraryTable ? raw : null)) as Record<string, unknown> | null;
    const tripData = (raw.tripData ?? {}) as Record<string, unknown>;
    if (!itineraryData) {
      setError("This saved trip has no itinerary data.");
      setHydrating(false);
      return;
    }

    // Clear stale UI state before hydrating.
    useMapStore.getState().setMarkers([]);
    useOnboardingStore.getState().setFlowStep("planner");

    const destination =
      (itineraryData.destination as string | undefined) ??
      (tripData.destination as string | undefined) ??
      "";
    const budget =
      (tripData.budget as string | undefined) ??
      (itineraryData.totalEstimatedCost as string | undefined) ??
      (itineraryData.totalBudget as string | undefined);

    try {
      commitItineraryToStores(itineraryData, {
        destination,
        budget,
        ...(tripData || {}),
      });
      setHydrating(false);
      // Run coordinate enrichment in background for complete marker fidelity.
      void enrichItineraryInBackground(itineraryData, destination);
    } catch {
      setError("Could not open this saved trip.");
      setHydrating(false);
    }
  }, [trip, trip?.id, trip?.title]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!accessToken) return <div className="p-6">Please sign in to view this trip.</div>;
  if (error) return <div className="p-6">{error}</div>;
  if (!trip) return <div className="p-6">Trip not found.</div>;
  if (hydrating || itinerary.length === 0) {
    return <div className="p-6">Opening your saved itinerary…</div>;
  }

  return <SpatialPlannerShell />;
}

