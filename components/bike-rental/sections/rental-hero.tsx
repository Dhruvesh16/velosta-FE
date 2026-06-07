"use client";

import Image from "next/image";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  CALENDAR_CLASS,
  HERO_BANNER,
  TIME_SLOTS,
  VT,
  WIDGET_INPUT,
  WIDGET_LABEL,
} from "../bike-rental-tokens";
import type { SearchFilters } from "../types";
import { formatBookingDate, isValidDateRange } from "../utils";

type Props = {
  filters: SearchFilters;
  cityName: string;
  searching: boolean;
  onChange: (p: Partial<SearchFilters>) => void;
  onSearch: () => void;
};

export function RentalHero({ filters, cityName, searching, onChange, onSearch }: Props) {
  const valid = isValidDateRange(filters.pickupDate, filters.dropDate);

  return (
    <section
      className="relative min-h-[calc(100dvh-88px)] overflow-hidden"
      aria-labelledby="hero-title"
    >
      <div className="absolute inset-0" style={{ backgroundColor: VT.heroBand }}>
        <Image
          src={HERO_BANNER}
          alt=""
          fill
          priority
          className="object-cover object-center lg:object-[70%_center]"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 hidden lg:block"
          style={{
            background:
              "linear-gradient(90deg, rgba(251,248,243,0.96) 0%, rgba(251,248,243,0.9) 24%, rgba(251,248,243,0.45) 38%, rgba(251,248,243,0.08) 52%, transparent 65%)",
          }}
        />
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(251,248,243,0.94) 0%, rgba(251,248,243,0.78) 40%, rgba(251,248,243,0.15) 75%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-[inherit] max-w-[1200px] items-center px-4 py-8 sm:px-6 lg:py-12">
        <div className="w-full max-w-[400px]">
          <p className="mb-3 hidden text-sm italic lg:block" style={{ color: VT.teal }}>
            Your next adventure starts here.
          </p>

          <div
            id="booking"
            className="rounded-2xl border p-5 sm:p-6"
            style={{ borderColor: VT.border, backgroundColor: VT.surface, boxShadow: VT.shadowLg }}
          >
            <h2 className="text-lg font-bold sm:text-xl" style={{ color: VT.text }}>
              Search your next ride
            </h2>
            <p className="mt-1 text-sm" style={{ color: VT.textMuted }}>
              Bike rentals in {cityName}
            </p>

            <div className="mt-5 space-y-5">
              <div>
                <p className={WIDGET_LABEL}>Pickup</p>
                <div className="grid grid-cols-2 gap-2">
                  <DateBtn date={filters.pickupDate} onSelect={(d) => onChange({ pickupDate: d })} />
                  <TimeBtn value={filters.pickupTime} onChange={(v) => onChange({ pickupTime: v })} />
                </div>
              </div>

              <div>
                <p className={WIDGET_LABEL}>Dropoff</p>
                <div className="grid grid-cols-2 gap-2">
                  <DateBtn date={filters.dropDate} onSelect={(d) => onChange({ dropDate: d })} minDate={filters.pickupDate} />
                  <TimeBtn value={filters.returnTime} onChange={(v) => onChange({ returnTime: v })} />
                </div>
              </div>

              {!valid && filters.pickupDate && filters.dropDate ? (
                <p className="text-xs text-red-600">Dropoff must be on or after pickup.</p>
              ) : null}

              <Button
                type="button"
                disabled={!valid || searching}
                onClick={onSearch}
                className="h-12 w-full rounded-full text-base font-semibold text-white hover:opacity-95"
                style={{ backgroundColor: VT.accent }}
              >
                {searching ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Searching…</> : "Search"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <h1 id="hero-title" className="sr-only">
        Bike rentals in {cityName} — scooters, motorcycles and EVs
      </h1>
    </section>
  );
}

function DateBtn({ date, onSelect, minDate }: { date?: Date; onSelect: (d?: Date) => void; minDate?: Date }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            WIDGET_INPUT,
            "justify-start gap-2 border-[#D9E2E1] font-normal hover:bg-[#F5EFE6]",
            !date && "text-[#94A3B8]",
          )}
          style={{ color: VT.text }}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" style={{ color: VT.teal }} />
          <span className="truncate">{formatBookingDate(date)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-auto rounded-2xl border p-0", CALENDAR_CLASS)}
        align="start"
        style={{ borderColor: VT.border, backgroundColor: VT.surface }}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          disabled={(d) => (minDate ? d < minDate : d < new Date(new Date().setHours(0, 0, 0, 0)))}
          initialFocus
          className={cn("rounded-2xl p-3", CALENDAR_CLASS)}
          classNames={{
            today: "bg-[#F5EFE6] text-[#0B1F2A] rounded-md font-semibold",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function TimeBtn({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn(WIDGET_INPUT, "gap-2 border-[#D9E2E1]")} style={{ color: VT.text }}>
        <Clock className="h-4 w-4 shrink-0" style={{ color: VT.teal }} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIME_SLOTS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
