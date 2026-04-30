"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, MapPin, ArrowRightLeft, Plus, Search } from "lucide-react";
import { DESTINATIONS } from "@/lib/data/destinations";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { useMapStore } from "@/lib/stores/map-store";
import { itineraryToMarkers } from "@/lib/services/geocoding";
import { searchPlaces } from "@/lib/services/geocoding";
import type { ItineraryData, TripData, RawItineraryDay } from "@/lib/types/planner.types";

type PlaceItem = {
  id: string;
  name: string;
  desc: string;
  cost: string;
  emoji: string;
};

type DragFrom = { day: number | null };

function parseCostNum(s: string): number {
  const m = s.replace(/[₹$€£,\s]/g, "").match(/[\d.]+/);
  return m ? Number(m[0]) : 0;
}

const TIME_SLOTS = ["09:00 AM", "11:30 AM", "02:00 PM", "04:30 PM", "07:00 PM"];

async function resolvePlaceCoords(
  placeName: string,
  destination: string,
  center: [number, number]
): Promise<[number, number]> {
  try {
    const q = new URLSearchParams({
      name: placeName,
      lng: String(center[0]),
      lat: String(center[1]),
      destination,
    });
    const res = await fetch(`/api/places?${q}`);
    if (res.ok) {
      const data = await res.json();
      if (
        data?.location &&
        typeof data.location.lng === "number" &&
        typeof data.location.lat === "number"
      ) {
        return [data.location.lng, data.location.lat];
      }
    }
  } catch {
    // fall through to center
  }
  return center;
}

export default function ManualItineraryBuilder() {
  const {
    selectedDestination,
    customDestination,
    duration,
    budgetAmount,
    setFlowStep,
  } = useOnboardingStore();
  const { setItineraryData } = usePlannerStore();
  const { setMarkers, flyTo } = useMapStore();

  const curatedDestination = useMemo(
    () => DESTINATIONS.find((d) => d.name === selectedDestination),
    [selectedDestination]
  );
  const destinationName = selectedDestination || customDestination?.name || "Your destination";
  const destinationCenter: [number, number] =
    curatedDestination?.coordinates ||
    customDestination?.coordinates ||
    [77.5946, 12.9716];

  const daysCount = Math.max(1, Math.min(duration || 3, 10));
  const [allPlaces, setAllPlaces] = useState<PlaceItem[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [placeInput, setPlaceInput] = useState("");
  const [unassigned, setUnassigned] = useState<string[]>([]);
  const [dayBuckets, setDayBuckets] = useState<Record<number, string[]>>(
    () =>
      Object.fromEntries(
        Array.from({ length: daysCount }, (_, i) => [i + 1, [] as string[]])
      ) as Record<number, string[]>
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<DragFrom>({ day: null });
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadPlaces() {
      setLoadingPlaces(true);
      const seeded: PlaceItem[] = [];
      const seen = new Set<string>();
      const pushIfNew = (item: PlaceItem) => {
        const k = item.name.toLowerCase().trim();
        if (!k || seen.has(k)) return;
        seen.add(k);
        seeded.push(item);
      };

      // 1) Curated destination places (full list from selected card context).
      if (curatedDestination) {
        curatedDestination.topPlaces.forEach((p, i) =>
          pushIfNew({
            id: `curated-${i}-${p.name}`,
            name: p.name,
            desc: p.desc,
            cost: p.cost,
            emoji: p.emoji,
          })
        );
        // Also include highlights so "all travel places" are visible choices.
        curatedDestination.highlights.forEach((h, i) =>
          pushIfNew({
            id: `highlight-${i}-${h}`,
            name: h,
            desc: `Popular in ${destinationName}`,
            cost: "Flexible",
            emoji: "📍",
          })
        );
      }

      // 2) Enrich with live places for custom destinations or sparse curated sets.
      if (!curatedDestination || seeded.length < 10) {
        const queries = [
          destinationName,
          `${destinationName} places to visit`,
          `${destinationName} attractions`,
        ];
        for (const q of queries) {
          const hits = await searchPlaces(q);
          hits.slice(0, 8).forEach((hit, i) =>
            pushIfNew({
              id: `live-${q}-${i}-${hit.name}`,
              name: hit.name,
              desc: hit.fullName || `Suggested near ${destinationName}`,
              cost: "Flexible",
              emoji: "📍",
            })
          );
          if (seeded.length >= 12) break;
        }
      }

      if (!cancelled) {
        setAllPlaces(seeded);
        setUnassigned(seeded.map((p) => p.id));
      }
      setLoadingPlaces(false);
    }
    loadPlaces();
    return () => {
      cancelled = true;
    };
  }, [curatedDestination, destinationName]);

  const placesById = useMemo(() => new Map(allPlaces.map((p) => [p.id, p])), [allPlaces]);

  const moveToDay = (placeId: string, targetDay: number) => {
    setUnassigned((prev) => prev.filter((id) => id !== placeId));
    setDayBuckets((prev) => {
      const next: Record<number, string[]> = {};
      for (const [k, vals] of Object.entries(prev)) {
        next[Number(k)] = vals.filter((id) => id !== placeId);
      }
      next[targetDay] = [...(next[targetDay] || []), placeId];
      return next;
    });
  };

  const moveToPool = (placeId: string) => {
    setDayBuckets((prev) => {
      const next: Record<number, string[]> = {};
      for (const [k, vals] of Object.entries(prev)) {
        next[Number(k)] = vals.filter((id) => id !== placeId);
      }
      return next;
    });
    setUnassigned((prev) => (prev.includes(placeId) ? prev : [...prev, placeId]));
  };

  const addCustomPlace = () => {
    const name = placeInput.trim();
    if (!name) return;
    const id = `manual-${Date.now()}-${name}`;
    const place: PlaceItem = {
      id,
      name,
      desc: `Custom stop in ${destinationName}`,
      cost: "Flexible",
      emoji: "✨",
    };
    setAllPlaces((prev) => [place, ...prev]);
    setUnassigned((prev) => [id, ...prev]);
    setPlaceInput("");
  };

  const buildManualItinerary = async () => {
    if (building) return;
    setBuilding(true);
    try {
      const rowsByDay = await Promise.all(
        Array.from({ length: daysCount }, async (_, idx) => {
          const day = idx + 1;
          const ids = dayBuckets[day] || [];
          const resolved = await Promise.all(
            ids.map(async (id, i) => {
              const p = placesById.get(id);
              if (!p) return null;
              const coords = await resolvePlaceCoords(
                p.name,
                destinationName,
                destinationCenter
              );
              return {
                time: TIME_SLOTS[i % TIME_SLOTS.length],
                activity: `Visit ${p.name}`,
                description: p.desc,
                distance: "",
                pricing: p.cost,
                coordinates: coords,
              };
            })
          );
          return { day, rows: resolved.filter(Boolean) as NonNullable<(typeof resolved)[number]>[] };
        })
      );

      const itineraryTable: RawItineraryDay[] = rowsByDay.map((d) => ({
        day: d.day,
        theme: d.rows.length > 0 ? `Day ${d.day} · Your curated picks` : `Day ${d.day} · Leisure`,
        dailyCost: d.rows.length
          ? `₹${d.rows.reduce((sum, r) => sum + parseCostNum(r.pricing || ""), 0).toLocaleString("en-IN")}`
          : "₹0",
        rows: d.rows,
      }));

      const total = itineraryTable.reduce(
        (sum, d) => sum + parseCostNum(d.dailyCost || ""),
        0
      );

      const itineraryData: ItineraryData = {
        destination: destinationName,
        duration: `${daysCount} days`,
        summary: "Custom itinerary built manually with Velosta AI guidance.",
        itineraryTable,
        totalEstimatedCost: `₹${total.toLocaleString("en-IN")}`,
        localTips: [
          "Drag more places into each day to balance your route.",
          "Keep 3 to 5 stops/day for a relaxed pace.",
        ],
      };

      const tripData: TripData = {
        destination: destinationName,
        budget: `₹${budgetAmount.toLocaleString("en-IN")}`,
      };

      setItineraryData(itineraryData, tripData);
      const built = usePlannerStore.getState().itinerary;
      setMarkers(itineraryToMarkers(built));
      flyTo(destinationCenter, 11, 35);
      setFlowStep("planner");
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#FBF8F3] pt-20 px-4 pb-4 overflow-hidden">
      <div className="mx-auto max-w-7xl h-full flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setFlowStep("explore")}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B1F2A]/60 hover:text-[#0B1F2A]"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#2F6F73] font-semibold">
              Manual builder
            </p>
            <h2 className="font-serif text-[24px] text-[#0B1F2A]">{destinationName}</h2>
            <p className="text-[11px] text-[#0B1F2A]/45 mt-1">
              Assign places day-wise, then generate your map itinerary.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 min-h-0 flex-1">
          <section className="min-h-0 rounded-2xl border border-[#0B1F2A]/10 bg-white/80 p-4 overflow-y-auto">
            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#0B1F2A]/50 font-semibold">
              <ArrowRightLeft size={13} />
              Drag places into days
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: daysCount }, (_, idx) => idx + 1).map((day) => (
                <div
                  key={day}
                  className="rounded-xl border border-[#0B1F2A]/10 bg-[#FBF8F3] p-3 min-h-[180px]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => draggingId && moveToDay(draggingId, day)}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2F6F73] mb-2">
                    Day {day}
                  </p>
                  <div className="space-y-2">
                    {(dayBuckets[day] || []).map((id) => {
                      const p = placesById.get(id);
                      if (!p) return null;
                      return (
                        <motion.div
                          key={id}
                          draggable
                          onDragStart={() => {
                            setDraggingId(id);
                            setDragFrom({ day });
                          }}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDragFrom({ day: null });
                          }}
                          className="rounded-lg border border-[#D97757]/25 bg-white px-2.5 py-2 cursor-grab active:cursor-grabbing"
                        >
                          <p className="text-sm font-semibold text-[#0B1F2A]">{p.emoji} {p.name}</p>
                          <p className="text-[11px] text-[#0B1F2A]/55 line-clamp-2">{p.desc}</p>
                        </motion.div>
                      );
                    })}
                    {(dayBuckets[day] || []).length === 0 && (
                      <div className="rounded-lg border border-dashed border-[#0B1F2A]/18 p-3 text-[11px] text-[#0B1F2A]/40">
                        Drop places here
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="min-h-0 rounded-2xl border border-[#0B1F2A]/10 bg-white/80 p-4 overflow-y-auto">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#B85F44] font-semibold mb-3">
              Places to visit
            </p>
            <div className="mb-3 flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0B1F2A]/40"
                />
                <input
                  value={placeInput}
                  onChange={(e) => setPlaceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCustomPlace();
                  }}
                  placeholder="Add custom place"
                  className="w-full rounded-lg border border-[#0B1F2A]/12 bg-[#FBF8F3] pl-8 pr-2.5 py-2 text-[12px] text-[#0B1F2A] outline-none focus:border-[#D97757]/60"
                />
              </div>
              <button
                type="button"
                onClick={addCustomPlace}
                className="inline-flex items-center justify-center rounded-lg border border-[#D97757]/35 bg-[#F5EFE6] px-2.5 text-[#B85F44] hover:bg-[#F5EFE6]/80"
                aria-label="Add custom place"
              >
                <Plus size={14} />
              </button>
            </div>
            <div
              className="mb-3 rounded-lg border border-dashed border-[#0B1F2A]/18 p-3 text-[11px] text-[#0B1F2A]/45"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => draggingId && dragFrom.day !== null && moveToPool(draggingId)}
            >
              Drop here to unassign
            </div>
            <div className="space-y-2">
              {loadingPlaces && (
                <div className="rounded-lg border border-[#0B1F2A]/8 bg-[#FBF8F3] p-3 text-[11px] text-[#0B1F2A]/45">
                  Loading places for {destinationName}...
                </div>
              )}
              {unassigned.map((id) => {
                const p = placesById.get(id);
                if (!p) return null;
                return (
                  <motion.div
                    key={id}
                    draggable
                    onDragStart={() => {
                      setDraggingId(id);
                      setDragFrom({ day: null });
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragFrom({ day: null });
                    }}
                    className="rounded-lg border border-[#0B1F2A]/10 bg-[#FBF8F3] px-3 py-2.5 cursor-grab active:cursor-grabbing"
                  >
                    <p className="text-sm font-semibold text-[#0B1F2A]">{p.emoji} {p.name}</p>
                    <p className="text-[11px] text-[#0B1F2A]/55">{p.desc}</p>
                    <p className="text-[10px] text-[#D97757] font-semibold mt-1">{p.cost}</p>
                  </motion.div>
                );
              })}
              {!loadingPlaces && unassigned.length === 0 && (
                <div className="rounded-lg border border-[#0B1F2A]/8 bg-[#FBF8F3] p-3 text-[11px] text-[#0B1F2A]/45">
                  All places are assigned. Add more custom places or generate.
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={buildManualItinerary}
              disabled={building}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #D97757, #B85F44)",
                boxShadow: "0 14px 30px -10px rgba(217,119,87,0.45)",
              }}
            >
              <Sparkles size={15} />
              {building ? "Generating map itinerary..." : "Generate itinerary map"}
            </button>
            <p className="mt-2 text-[11px] text-[#0B1F2A]/45 leading-relaxed">
              Velosta AI will geocode your selected places and open the full map planner.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

