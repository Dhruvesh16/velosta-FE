"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@/app/utils/context";
import { listSavedTrips, type SavedTripRecord } from "@/lib/services/trips-service";

export default function SavedTripViewPage() {
  const params = useParams<{ id: string }>();
  const { accessToken, loading } = useUser();
  const [trip, setTrip] = useState<SavedTripRecord | null>(null);

  useEffect(() => {
    if (!accessToken || !params?.id) return;
    listSavedTrips()
      .then((d) => {
        const row = (d.savedTrips || []).find((x) => x.id === params.id) || null;
        setTrip(row);
      })
      .catch(() => setTrip(null));
  }, [accessToken, params?.id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!accessToken) return <div className="p-6">Please sign in to view this trip.</div>;
  if (!trip) return <div className="p-6">Trip not found.</div>;

  return (
    <main className="min-h-screen bg-[#FBF8F3] p-6">
      <div className="max-w-3xl mx-auto bg-white border border-[#0B1F2A]/10 rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-[#0B1F2A]">{trip.title || "Saved trip"}</h1>
        <p className="text-xs text-[#0B1F2A]/50 mt-1">{new Date(trip.createdAt).toLocaleString()}</p>
        <pre className="mt-5 text-xs bg-[#FBF8F3] border border-[#0B1F2A]/10 rounded-xl p-4 overflow-auto">
          {JSON.stringify(trip.tripSnapshot || {}, null, 2)}
        </pre>
      </div>
    </main>
  );
}

