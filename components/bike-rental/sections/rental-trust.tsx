"use client";

import { Headphones, IndianRupee, Shield, Wrench } from "lucide-react";

import { VT, VT_SECTION } from "../bike-rental-tokens";

const ITEMS = [
  { icon: Shield, title: "Verified fleet", desc: "Every vehicle inspected before handover" },
  { icon: IndianRupee, title: "No hidden charges", desc: "Transparent pricing at checkout" },
  { icon: Wrench, title: "Roadside support", desc: "24/7 assistance across cities" },
  { icon: Headphones, title: "Live support", desc: "Phone, chat & WhatsApp help" },
];

export function RentalTrust() {
  return (
    <section className="border-b py-8 lg:py-10" style={{ borderColor: VT.border, backgroundColor: VT.surface }}>
      <div className={`${VT_SECTION} flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between sm:gap-0`}>
        {ITEMS.map(({ icon: Icon, title, desc }, i) => (
          <div
            key={title}
            className="relative flex flex-1 items-start gap-3 px-0 sm:px-6 first:sm:pl-0 last:sm:pr-0"
          >
            {i > 0 ? (
              <span
                className="absolute -left-px top-1 hidden h-10 w-px sm:block"
                style={{ backgroundColor: VT.border }}
                aria-hidden
              />
            ) : null}
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: VT.accentSoft, color: VT.accent }}
            >
              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug" style={{ color: VT.text }}>
                {title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed sm:text-sm" style={{ color: VT.textMuted }}>
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
