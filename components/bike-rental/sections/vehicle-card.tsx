"use client";

import Image from "next/image";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { VT } from "../bike-rental-tokens";
import type { DemoBike } from "../types";
import { categoryLabel, fuelTypeFor } from "../utils";

export function VehicleCard({
  bike,
  days,
  onBook,
}: {
  bike: DemoBike;
  days: number;
  onBook: (b: DemoBike) => void;
}) {
  const total = bike.pricePerDay * days;
  const avail = bike.available > 0;

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-white transition hover:-translate-y-1"
      style={{ borderColor: VT.border, boxShadow: VT.shadow }}
    >
      <div className="relative aspect-[5/3] overflow-hidden bg-[#F5EFE6]">
        <Image
          src={bike.image}
          alt={`${bike.brand} ${bike.name}`}
          fill
          className="object-contain p-4 transition duration-300 group-hover:scale-105"
          sizes="(max-width:768px) 100vw, 280px"
        />
        {!avail ? (
          <span className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm font-semibold" style={{ color: VT.text }}>
            Unavailable
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: VT.textMuted }}>{bike.brand}</p>
            <h3 className="text-base font-bold" style={{ color: VT.text }}>{bike.name}</h3>
          </div>
          <span
            className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: VT.accentSoft, color: VT.accent }}
          >
            <Star className="h-3 w-3 fill-current" />
            {bike.rating.toFixed(1)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <SpecPill label={categoryLabel(bike.category)} />
          <SpecPill label={bike.engine} />
          <SpecPill label={bike.transmission} />
        </div>

        <p className="mt-2 text-xs" style={{ color: VT.textMuted }}>{bike.mileage} · {bike.hubName}</p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="text-xs" style={{ color: VT.textMuted }}>Starting from</p>
            <p className="text-xl font-bold" style={{ color: VT.text }}>
              ₹{bike.pricePerDay.toLocaleString("en-IN")}
              <span className="text-sm font-normal" style={{ color: VT.textMuted }}>/day</span>
            </p>
            <p className="text-[11px]" style={{ color: VT.textMuted }}>₹{total.toLocaleString("en-IN")} · {days} day(s)</p>
          </div>
          <Button
            type="button"
            disabled={!avail}
            onClick={() => onBook(bike)}
            className={cn("h-10 shrink-0 rounded-full px-4 text-sm font-semibold text-white", !avail && "opacity-50")}
            style={{ backgroundColor: VT.accent }}
          >
            Book
          </Button>
        </div>
      </div>
    </article>
  );
}

function SpecPill({ label }: { label: string }) {
  return (
    <span
      className="rounded-md border px-2 py-0.5 text-[10px] font-medium"
      style={{ borderColor: VT.border, backgroundColor: VT.cardMuted, color: VT.textSecondary }}
    >
      {label}
    </span>
  );
}
