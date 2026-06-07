"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bike,
  Calendar,
  CircleParking,
  FileText,
  Gauge,
  HardHat,
  IndianRupee,
  KeyRound,
  MapPin,
  Route,
  Search,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";

import { VT, VT_SECTION } from "../bike-rental-tokens";

type Props = { cityName: string };

const WHY_ITEMS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Timer, title: "Your pace", desc: "Travel without rush — stop wherever you want." },
  { icon: CircleParking, title: "Easy parking", desc: "Skip traffic jams and parking headaches." },
  { icon: IndianRupee, title: "Save money", desc: "Cheaper than daily cabs for city exploration." },
  { icon: MapPin, title: "See more", desc: "Hit landmarks and food streets on your schedule." },
];

const BIKE_TYPES: { icon: LucideIcon; label: string }[] = [
  { icon: Bike, label: "Royal Enfield cruisers" },
  { icon: Zap, label: "Sport bikes" },
  { icon: Gauge, label: "Commuter motorcycles" },
  { icon: Bike, label: "Automatic scooters" },
];

const STEPS: { icon: LucideIcon; step: string; title: string; desc: string }[] = [
  { icon: Calendar, step: "01", title: "Pick dates", desc: "Select your city and rental dates above." },
  { icon: Search, step: "02", title: "Choose a ride", desc: "Browse the fleet and pick your vehicle." },
  { icon: FileText, step: "03", title: "Confirm booking", desc: "Upload documents and pay securely online." },
  { icon: KeyRound, step: "04", title: "Collect & go", desc: "Pick up from the nearest hub and ride." },
];

export function RentalSeo({ cityName }: Props) {
  return (
    <section className="border-t py-14 lg:py-20" style={{ borderColor: VT.border, backgroundColor: VT.bg }}>
      <div className={VT_SECTION}>
        <div className="max-w-3xl">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: VT.accent }}>
            <Route className="h-4 w-4" strokeWidth={2} aria-hidden />
            Plan your ride
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl" style={{ color: VT.text }}>
            Bike rental in {cityName}
          </h2>
          <p className="mt-1 text-lg font-medium sm:text-xl" style={{ color: VT.textMuted }}>
            Best bike &amp; scooty rentals
          </p>
          <p className="mt-5 text-base leading-relaxed sm:text-lg" style={{ color: VT.textSecondary }}>
            Looking for a bike rental in {cityName}? Whether you&apos;re a tourist or a local, renting a two-wheeler is
            one of the easiest ways to explore — without waiting for cabs or crowded public transport.
          </p>
          <p className="mt-4 flex items-start gap-2 text-base leading-relaxed" style={{ color: VT.textSecondary }}>
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: VT.teal }} strokeWidth={2} aria-hidden />
            <span>
              With <strong style={{ color: VT.text }}>Velosta</strong>, you get verified scooters, motorcycles
              &amp; EVs with transparent pricing, low deposits, and instant online booking across India.
            </span>
          </p>
        </div>

        <div className="mt-14">
          <h3 className="text-xl font-bold sm:text-2xl" style={{ color: VT.text }}>
            Why choose bike rentals in {cityName}?
          </h3>
          <ul className="mt-6 grid gap-0 sm:grid-cols-2">
            {WHY_ITEMS.map((item) => (
              <li
                key={item.title}
                className="flex gap-4 border-t py-5 sm:px-4 sm:odd:border-r"
                style={{ borderColor: VT.border }}
              >
                <item.icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: VT.accent }} strokeWidth={2} aria-hidden />
                <div>
                  <p className="font-semibold" style={{ color: VT.text }}>
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: VT.textMuted }}>
                    {item.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="relative mt-14 overflow-hidden rounded-2xl px-6 py-8 sm:px-10 sm:py-10"
          style={{ backgroundColor: VT.cardMuted }}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-40"
            style={{ backgroundColor: VT.accentSoft }}
            aria-hidden
          />
          <h3 className="relative flex items-center gap-2 text-xl font-bold sm:text-2xl" style={{ color: VT.text }}>
            <Bike className="h-6 w-6" style={{ color: VT.accent }} strokeWidth={2} aria-hidden />
            Types of bikes &amp; scooties on rent
          </h3>
          <p className="relative mt-3 flex max-w-2xl items-start gap-2 text-base leading-relaxed" style={{ color: VT.textSecondary }}>
            <HardHat className="mt-0.5 h-5 w-5 shrink-0" style={{ color: VT.teal }} strokeWidth={2} aria-hidden />
            <span>Every vehicle is maintained to fleet standards — helmets included with every booking.</span>
          </p>
          <div className="relative mt-6 flex flex-wrap gap-2.5">
            {BIKE_TYPES.map((t) => (
              <span
                key={t.label}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: VT.surface, color: VT.text }}
              >
                <t.icon className="h-4 w-4" style={{ color: VT.accent }} strokeWidth={2} aria-hidden />
                {t.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-14">
          <h3 className="flex items-center gap-2 text-xl font-bold sm:text-2xl" style={{ color: VT.text }}>
            How to rent a bike in {cityName}
            <ArrowRight className="h-5 w-5" style={{ color: VT.accent }} strokeWidth={2} aria-hidden />
          </h3>

          <ol className="relative mt-10 flex flex-col gap-8 lg:flex-row lg:gap-0">
            <span
              className="absolute left-[19px] top-3 hidden h-[calc(100%-24px)] w-px lg:left-0 lg:right-0 lg:top-[22px] lg:block lg:h-px lg:w-full"
              style={{ backgroundColor: VT.borderStrong }}
              aria-hidden
            />
            {STEPS.map((s) => (
              <li key={s.step} className="relative flex flex-1 gap-4 lg:flex-col lg:items-center lg:gap-0 lg:text-center">
                <span
                  className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full lg:mx-auto"
                  style={{ backgroundColor: VT.accent, color: "#fff", boxShadow: `0 0 0 4px ${VT.bg}` }}
                >
                  <s.icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
                <div className="lg:mt-5 lg:px-2">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: VT.accent }}>
                    Step {s.step}
                  </span>
                  <p className="mt-1 font-semibold" style={{ color: VT.text }}>
                    {s.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: VT.textMuted }}>
                    {s.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
