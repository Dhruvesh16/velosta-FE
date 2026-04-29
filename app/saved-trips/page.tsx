"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/app/utils/context";
import { listSavedTrips, createSharedTrip, type SavedTripRecord } from "@/lib/services/trips-service";

export default function SavedTripsPage() {
  const { accessToken, loading } = useUser();
  const [items, setItems] = useState<SavedTripRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    listSavedTrips()
      .then((d) => setItems(d.savedTrips || []))
      .catch(() => setItems([]));
  }, [accessToken]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!accessToken) return <div className="p-6">Please sign in to view saved trips.</div>;

  return (
    <main className="min-h-screen bg-[#FBF8F3] p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-[#0B1F2A] mb-4">Saved trips</h1>
        {items.length === 0 ? (
          <p className="text-[#0B1F2A]/60">No saved trips yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((t) => (
              <div key={t.id} className="bg-white border border-[#0B1F2A]/10 rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[#0B1F2A]">{t.title || "Untitled trip"}</p>
                  <p className="text-xs text-[#0B1F2A]/50">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/saved-trips/view/${t.id}`}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#0B1F2A] text-white"
                  >
                    View
                  </Link>
                  <button
                    disabled={busyId === t.id}
                    onClick={async () => {
                      const snapshot = t.tripSnapshot as Record<string, unknown> | undefined;
                      if (!snapshot) return;
                      setBusyId(t.id);
                      try {
                        const title = t.title || "Shared trip";
                        const d = await createSharedTrip(title, snapshot);
                        const url = `${window.location.origin}/saved-trips/shared/${d.sharedTrip.shareToken}`;
                        await navigator.clipboard.writeText(url);
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border border-[#0B1F2A]/20 text-[#0B1F2A]"
                  >
                    {busyId === t.id ? "Sharing…" : "Share"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

