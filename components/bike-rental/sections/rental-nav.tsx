"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import { MapPin, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { CITY_HUBS } from "../demo-data";
import { VT, VT_SECTION } from "../bike-rental-tokens";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"] });

const RENTAL_LINKS = [
  { href: "#fleet", label: "Fleet" },
  { href: "#packages", label: "Plans" },
  { href: "#faq", label: "FAQ" },
];

const SITE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/velosta-ai", label: "Velosta AI" },
  { href: "/stories", label: "Stories" },
];

type Props = {
  cityId: string;
  onCityChange: (id: string) => void;
  onSearchFocus: () => void;
};

export function RentalNav({ cityId, onCityChange, onSearchFocus }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const city = CITY_HUBS.find((c) => c.id === cityId) ?? CITY_HUBS[0];

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <div
        className={cn(
          "mx-auto flex max-w-6xl items-center rounded-full border px-3 py-2 shadow-sm backdrop-blur-md transition-shadow sm:px-5 sm:py-2.5",
          scrolled && "shadow-md",
        )}
        style={{
          backgroundColor: "rgba(251, 248, 243, 0.88)",
          borderColor: "rgba(11, 31, 42, 0.08)",
        }}
      >
        <Link
          href="/"
          className={cn(playfair.className, "shrink-0 text-[22px] tracking-tight")}
          style={{ color: VT.text }}
        >
          Velosta
        </Link>

        <nav className="mx-auto hidden items-center gap-6 lg:flex">
          {RENTAL_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm font-medium transition-colors hover:text-[#D97757]"
              style={{ color: VT.textSecondary }}
            >
              {l.label}
            </a>
          ))}
          <span className="h-4 w-px" style={{ backgroundColor: VT.border }} />
          {SITE_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-sm transition-colors hover:text-[#D97757]"
              style={{ color: VT.textMuted }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <div
            className="flex items-center rounded-full border pl-2"
            style={{ borderColor: VT.border, backgroundColor: VT.cardMuted }}
          >
            <MapPin className="h-4 w-4 shrink-0" style={{ color: VT.accent }} />
            <Select value={cityId} onValueChange={onCityChange}>
              <SelectTrigger className="h-9 w-[130px] border-0 bg-transparent text-sm font-medium shadow-none focus:ring-0" style={{ color: VT.text }}>
                <SelectValue>{city.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CITY_HUBS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            className="h-9 rounded-full px-5 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: VT.accent }}
            onClick={onSearchFocus}
          >
            Book now
          </Button>
        </div>

        <button
          type="button"
          className="ml-auto rounded-full p-2 md:hidden"
          style={{ color: VT.text }}
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div
          className="mx-auto mt-2 max-w-6xl rounded-2xl border p-4 md:hidden"
          style={{ borderColor: VT.border, backgroundColor: VT.surface, boxShadow: VT.shadowLg }}
        >
          <Select value={cityId} onValueChange={(v) => { onCityChange(v); setOpen(false); }}>
            <SelectTrigger className="mb-3 h-11" style={{ borderColor: VT.border, color: VT.text }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CITY_HUBS.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {[...RENTAL_LINKS, ...SITE_LINKS].map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="block py-2.5 text-sm"
              style={{ color: VT.textSecondary }}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <Button className="mt-3 w-full rounded-full text-white" style={{ backgroundColor: VT.accent }} onClick={() => { onSearchFocus(); setOpen(false); }}>
            Book now
          </Button>
        </div>
      ) : null}
    </header>
  );
}
