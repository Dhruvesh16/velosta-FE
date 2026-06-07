"use client";

import { useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { DEMO_BIKES, TOP_SELLING_IDS } from "../demo-data";
import { VT, VT_SECTION } from "../bike-rental-tokens";
import type { DemoBike, FleetFilter, SearchFilters } from "../types";
import { filterAndSortBikes, fleetFilterLabel, formatResultsLocationLabel, matchesFleetFilter, rentalDays } from "../utils";
import { VehicleCard } from "./vehicle-card";

const FILTERS: FleetFilter[] = ["all", "bikes", "scooters", "ev", "premium", "sport"];

export function RentalFleet({
  filters,
  searched,
  onFilterChange,
}: {
  filters: SearchFilters;
  searched: boolean;
  onFilterChange: (f: FleetFilter) => void;
}) {
  const { toast } = useToast();
  const days = rentalDays(filters.pickupDate, filters.dropDate);

  const bikes = useMemo(() => {
    let list = searched
      ? filterAndSortBikes(filters)
      : DEMO_BIKES.filter((b) => TOP_SELLING_IDS.includes(b.id)).map((b) => ({ ...b, distanceKm: 0 }));

    if (filters.fleetFilter !== "all") {
      list = list.filter((b) => matchesFleetFilter(b.category, filters.fleetFilter));
    }
    return list;
  }, [filters, searched]);

  const title = searched
    ? `Available bikes near ${formatResultsLocationLabel(filters)}`
    : `Popular bikes in ${formatResultsLocationLabel(filters)}`;

  const handleBook = (bike: DemoBike) => {
    toast({
      title: `${bike.brand} ${bike.name}`,
      description: `Booking demo — ₹${(bike.pricePerDay * days).toLocaleString("en-IN")} for ${days} day(s). Checkout coming soon.`,
    });
  };

  return (
    <section id="fleet" className="py-12 lg:py-16" style={{ backgroundColor: VT.bg }}>
      <div className={VT_SECTION}>
        <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: VT.text }}>{title}</h2>
        <p className="mt-2 text-sm" style={{ color: VT.textMuted }}>
          {searched ? `${bikes.length} vehicles match your dates` : "Top picks — search above to check live availability"}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFilterChange(f)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                filters.fleetFilter === f ? "border-[#D97757] text-white" : "hover:border-[#C5D0CF]",
              )}
              style={
                filters.fleetFilter === f
                  ? { backgroundColor: VT.accent }
                  : { backgroundColor: VT.surface, borderColor: VT.border, color: VT.textSecondary }
              }
            >
              {fleetFilterLabel(f)}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {bikes.length === 0 ? (
            <p
              className="col-span-full rounded-xl border border-dashed py-16 text-center"
              style={{ borderColor: VT.borderStrong, color: VT.textMuted }}
            >
              No bikes available for these filters. Try another category or adjust dates.
            </p>
          ) : (
            bikes.map((bike) => (
              <VehicleCard key={bike.id} bike={bike} days={days} onBook={handleBook} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
