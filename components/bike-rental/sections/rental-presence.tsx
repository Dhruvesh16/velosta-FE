"use client";

import { MapPin } from "lucide-react";

import { CITY_HUBS } from "../demo-data";
import { VT, VT_SECTION } from "../bike-rental-tokens";

type Props = { activeCityId: string; onSelect: (cityId: string) => void };

export function RentalPresence({ activeCityId, onSelect }: Props) {
  return (
    <section id="locations" className="py-12 lg:py-16" style={{ backgroundColor: VT.surface }}>
      <div className={VT_SECTION}>
        <h2 className="text-2xl font-bold" style={{ color: VT.text }}>
          Our presence
        </h2>
        <p className="mt-2 text-sm" style={{ color: VT.textMuted }}>
          Bikes for rent across India — tap your city
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {CITY_HUBS.map((city) => {
            const active = city.id === activeCityId;
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => onSelect(city.id)}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition"
                style={
                  active
                    ? { backgroundColor: VT.accent, color: "#fff" }
                    : { backgroundColor: VT.cardMuted, color: VT.textSecondary }
                }
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
                {city.name}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
