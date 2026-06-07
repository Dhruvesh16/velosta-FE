"use client";

import { Check } from "lucide-react";

import { RENTAL_PACKAGES } from "../demo-data";
import { VT, VT_SECTION } from "../bike-rental-tokens";

const FEATURED_ID = "weekly";

export function RentalPackages({ onBook }: { onBook: () => void }) {
  const featured = RENTAL_PACKAGES.find((p) => p.id === FEATURED_ID);
  const others = RENTAL_PACKAGES.filter((p) => p.id !== FEATURED_ID);

  return (
    <section id="packages" className="border-y py-12 lg:py-16" style={{ borderColor: VT.border, backgroundColor: VT.surface }}>
      <div className={VT_SECTION}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: VT.text }}>
              Rental plans
            </h2>
            <p className="mt-2 text-sm" style={{ color: VT.textMuted }}>
              Flexible options — daily to corporate fleet
            </p>
          </div>
          {featured ? (
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: VT.accent }}>
              Most popular · {featured.name}
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-stretch">
          {featured ? (
            <div
              className="relative flex flex-col overflow-hidden rounded-2xl p-6 lg:w-[38%] lg:shrink-0"
              style={{ backgroundColor: VT.text, color: VT.footerSand }}
            >
              <span
                className="absolute left-0 right-0 top-0 h-1"
                style={{ background: `linear-gradient(90deg, ${VT.accentStart}, ${VT.accent})` }}
                aria-hidden
              />
              <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Recommended</p>
              <p className="mt-2 text-xl font-bold">{featured.name}</p>
              <p className="mt-1 text-2xl font-extrabold" style={{ color: VT.accentStart }}>
                {featured.price}
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm opacity-90">
                {featured.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: VT.accentStart }} strokeWidth={2.5} aria-hidden />
                    {b}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={onBook}
                className="mt-6 rounded-full py-3 text-sm font-bold transition hover:opacity-90"
                style={{ backgroundColor: VT.accent, color: "#fff" }}
              >
                {featured.cta}
              </button>
            </div>
          ) : null}

          <div className="flex flex-1 flex-col divide-y" style={{ borderColor: VT.border }}>
            {others.map((pkg) => (
              <div
                key={pkg.id}
                className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                style={{ borderColor: VT.border }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-semibold" style={{ color: VT.text }}>
                      {pkg.name}
                    </p>
                    <p className="text-sm font-bold" style={{ color: VT.accent }}>
                      {pkg.price}
                    </p>
                  </div>
                  <p className="mt-1.5 text-sm" style={{ color: VT.textMuted }}>
                    {pkg.benefits.join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onBook}
                  className="shrink-0 self-start rounded-full border px-5 py-2 text-sm font-semibold transition hover:bg-[#FFF4EE] sm:self-center"
                  style={{ borderColor: VT.borderStrong, color: VT.text }}
                >
                  {pkg.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
