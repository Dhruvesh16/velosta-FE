import { addDays, differenceInCalendarDays, format, isBefore, startOfDay } from "date-fns";

import { CITY_HUBS, DEMO_BIKES } from "./demo-data";
import type { BikeCategory, BikeWithDistance, CityHub, DemoBike, FleetFilter, SearchFilters, VehicleType } from "./types";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findCityByQuery(query: string): CityHub | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    CITY_HUBS.find(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        c.id.includes(q),
    ) ?? null
  );
}

export function nearestCity(lat: number, lng: number): CityHub {
  let best = CITY_HUBS[0];
  let bestDist = Infinity;
  for (const city of CITY_HUBS) {
    const d = haversineKm(lat, lng, city.lat, city.lng);
    if (d < bestDist) {
      bestDist = d;
      best = city;
    }
  }
  return best;
}

export function searchCitySuggestions(query: string, limit = 6): CityHub[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITY_HUBS.slice(0, limit);
  return CITY_HUBS.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q),
  ).slice(0, limit);
}

export function resolveSearchPoint(filters: SearchFilters): { lat: number; lng: number; label: string } | null {
  if (filters.coords) {
    const city = filters.cityId
      ? CITY_HUBS.find((c) => c.id === filters.cityId)
      : nearestCity(filters.coords.lat, filters.coords.lng);
    return {
      lat: filters.coords.lat,
      lng: filters.coords.lng,
      label: city?.name ?? "Your location",
    };
  }
  if (filters.cityId) {
    const city = CITY_HUBS.find((c) => c.id === filters.cityId);
    if (city) return { lat: city.lat, lng: city.lng, label: `${city.name}, ${city.state}` };
  }
  const fromQuery = findCityByQuery(filters.locationQuery);
  if (fromQuery) {
    return { lat: fromQuery.lat, lng: fromQuery.lng, label: `${fromQuery.name}, ${fromQuery.state}` };
  }
  return null;
}

function matchesVehicleType(category: BikeCategory, vehicleType: VehicleType): boolean {
  switch (vehicleType) {
    case "all":
      return true;
    case "scooter":
      return category === "scooter";
    case "motorcycle":
      return category === "commuter" || category === "sport";
    case "premium":
      return category === "premium";
    case "ev":
      return category === "electric";
    default:
      return true;
  }
}

export function fuelTypeFor(category: BikeCategory): string {
  return category === "electric" ? "Electric" : "Petrol";
}

export function vehicleTypeLabel(type: VehicleType): string {
  const map: Record<VehicleType, string> = {
    all: "All vehicles",
    scooter: "Scooter",
    motorcycle: "Motorcycle",
    premium: "Premium Bike",
    ev: "EV",
  };
  return map[type];
}

export function matchesFleetFilter(category: BikeCategory, filter: FleetFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "scooters":
      return category === "scooter";
    case "ev":
      return category === "electric";
    case "adventure":
      return category === "premium" && false; // himalayan tagged premium - use premium filter
    case "sport":
      return category === "sport";
    case "cruiser":
      return category === "premium";
    case "premium":
      return category === "premium";
    case "bikes":
      return category !== "scooter" && category !== "electric";
    default:
      return true;
  }
}

export function fleetFilterLabel(f: FleetFilter): string {
  const map: Record<FleetFilter, string> = {
    all: "All",
    bikes: "Bikes",
    scooters: "Scooters",
    ev: "EVs",
    adventure: "Adventure",
    sport: "Sports",
    cruiser: "Cruiser",
    premium: "Premium",
  };
  return map[f];
}

export function filterAndSortBikes(filters: SearchFilters): BikeWithDistance[] {
  const point = resolveSearchPoint(filters);
  if (!point) return [];

  const maxRadiusKm = 80;
  let bikes: BikeWithDistance[] = DEMO_BIKES.map((bike) => ({
    ...bike,
    distanceKm: haversineKm(point.lat, point.lng, bike.lat, bike.lng),
  })).filter((b) => b.distanceKm <= maxRadiusKm);

  if (filters.fleetFilter !== "all") {
    bikes = bikes.filter((b) => matchesFleetFilter(b.category, filters.fleetFilter));
  }

  if (filters.vehicleType !== "all") {
    bikes = bikes.filter((b) => matchesVehicleType(b.category, filters.vehicleType));
  }

  if (filters.category !== "all") {
    bikes = bikes.filter((b) => b.category === filters.category);
  }

  switch (filters.sort) {
    case "price-low":
      bikes.sort((a, b) => a.pricePerDay - b.pricePerDay);
      break;
    case "price-high":
      bikes.sort((a, b) => b.pricePerDay - a.pricePerDay);
      break;
    case "rating":
      bikes.sort((a, b) => b.rating - a.rating);
      break;
    default:
      bikes.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  return bikes;
}

export function rentalDays(pickup?: Date, drop?: Date): number {
  if (!pickup || !drop) return 1;
  const days = differenceInCalendarDays(startOfDay(drop), startOfDay(pickup));
  return Math.max(1, days || 1);
}

export function formatDisplayDate(d?: Date): string {
  if (!d) return "Select date";
  return format(d, "EEE, d MMM yyyy");
}

/** Full date for booking bar — e.g. Jun 7, 2026 */
export function formatBookingDate(d?: Date): string {
  if (!d) return "Select date";
  return format(d, "MMM d, yyyy");
}

export function defaultPickupDate(): Date {
  return addDays(startOfDay(new Date()), 1);
}

export function defaultDropDate(): Date {
  return addDays(startOfDay(new Date()), 3);
}

export function categoryLabel(cat: BikeCategory | "all"): string {
  const map: Record<BikeCategory | "all", string> = {
    all: "All rides",
    scooter: "Scooters",
    commuter: "Commuter",
    premium: "Premium",
    electric: "Electric",
    sport: "Sport",
  };
  return map[cat];
}

export function totalPrice(bike: DemoBike, days: number): number {
  return bike.pricePerDay * days;
}

export function isValidDateRange(pickup?: Date, drop?: Date): boolean {
  if (!pickup || !drop) return false;
  return !isBefore(startOfDay(drop), startOfDay(pickup));
}

/** Human-readable location for results headings — avoids "near Near Hyderabad". */
export function formatResultsLocationLabel(filters: SearchFilters): string {
  const point = resolveSearchPoint(filters);
  if (!point) return "your search";

  let label = point.label.trim();
  if (label.toLowerCase().startsWith("near ")) {
    label = label.slice(5).trim();
  }

  if (filters.coords) {
    return `${label} · your location`;
  }

  return label;
}
