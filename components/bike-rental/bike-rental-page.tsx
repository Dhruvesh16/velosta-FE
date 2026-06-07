"use client";

import { useRef, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";

import Footer from "@/components/footer";

import { CITY_HUBS } from "./demo-data";
import { VT } from "./bike-rental-tokens";
import type { SearchFilters } from "./types";
import {
  defaultDropDate,
  defaultPickupDate,
  findCityByQuery,
  isValidDateRange,
} from "./utils";
import { RentalNav } from "./sections/rental-nav";
import { RentalHero } from "./sections/rental-hero";
import { RentalFleet } from "./sections/rental-fleet";
import { RentalShowcase } from "./sections/rental-showcase";
import { RentalTrust } from "./sections/rental-trust";
import { RentalPackages } from "./sections/rental-packages";
import { RentalSeo } from "./sections/rental-seo";
import { RentalPresence } from "./sections/rental-presence";
import { RentalFaq, RentalPromoPopup } from "./sections/rental-faq-footer";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

const defaultFilters = (cityId = "hyderabad"): SearchFilters => {
  const c = CITY_HUBS.find((x) => x.id === cityId) ?? CITY_HUBS[0];
  return {
    locationQuery: `${c.name}, ${c.state}`,
    coords: null,
    cityId: c.id,
    pickupDate: defaultPickupDate(),
    dropDate: defaultDropDate(),
    pickupTime: "10:00 AM",
    returnTime: "10:00 AM",
    vehicleType: "all",
    promoCode: "",
    category: "all",
    fleetFilter: "all",
    sort: "nearest",
  };
};

export function BikeRentalPage() {
  const fleetRef = useRef<HTMLDivElement>(null);
  const [cityId, setCityId] = useState("hyderabad");
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(() => defaultFilters("hyderabad"));

  const city = CITY_HUBS.find((c) => c.id === cityId) ?? CITY_HUBS[0];

  const syncCity = (id: string) => {
    const c = CITY_HUBS.find((x) => x.id === id);
    if (!c) return;
    setCityId(id);
    setFilters((f) => ({
      ...f,
      cityId: id,
      locationQuery: `${c.name}, ${c.state}`,
      coords: null,
    }));
  };

  const updateFilters = (patch: Partial<SearchFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
  };

  const scrollFleet = () => fleetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const scrollBooking = () => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "center" });

  const runSearch = () => {
    if (!isValidDateRange(filters.pickupDate, filters.dropDate)) return;
    setSearching(true);
    const resolved = findCityByQuery(filters.locationQuery) ?? city;
    setFilters((f) => ({
      ...f,
      cityId: resolved.id,
      locationQuery: `${resolved.name}, ${resolved.state}`,
    }));
    setCityId(resolved.id);
    setSearched(true);
    scrollFleet();
    window.setTimeout(() => setSearching(false), 600);
  };

  return (
    <div className={jakarta.className} style={{ backgroundColor: VT.bg, color: VT.text }}>
      <RentalNav cityId={cityId} onCityChange={syncCity} onSearchFocus={scrollBooking} />

      <RentalHero
        filters={filters}
        cityName={city.name}
        searching={searching}
        onChange={updateFilters}
        onSearch={runSearch}
      />

      <RentalTrust />

      <div ref={fleetRef} className="relative z-10">
        <RentalFleet filters={filters} searched={searched} onFilterChange={(fleetFilter) => updateFilters({ fleetFilter })} />
      </div>

      <RentalShowcase />
      <RentalPackages onBook={scrollBooking} />
      <RentalSeo cityName={city.name} />
      <RentalPresence activeCityId={cityId} onSelect={(id) => { syncCity(id); setSearched(true); scrollFleet(); }} />
      <RentalFaq />
      <RentalPromoPopup />

      <Footer />
    </div>
  );
}
