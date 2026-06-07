export type BikeCategory = "scooter" | "commuter" | "premium" | "electric" | "sport";

export type CityHub = {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
};

export type DemoBike = {
  id: string;
  name: string;
  brand: string;
  category: BikeCategory;
  cityId: string;
  hubName: string;
  lat: number;
  lng: number;
  pricePerDay: number;
  deposit: number;
  rating: number;
  reviewCount: number;
  engine: string;
  mileage: string;
  transmission: string;
  image: string;
  tags: string[];
  available: number;
};

export type VehicleType = "all" | "scooter" | "motorcycle" | "premium" | "ev";

export type SearchFilters = {
  locationQuery: string;
  coords: { lat: number; lng: number } | null;
  cityId: string | null;
  pickupDate: Date | undefined;
  dropDate: Date | undefined;
  pickupTime: string;
  returnTime: string;
  vehicleType: VehicleType;
  promoCode: string;
  category: BikeCategory | "all";
  fleetFilter: FleetFilter;
  sort: "nearest" | "price-low" | "price-high" | "rating";
};

export type FleetFilter = "all" | "bikes" | "scooters" | "ev" | "adventure" | "sport" | "cruiser" | "premium";

export type CityShowcase = {
  id: string;
  name: string;
  image: string;
  bikeCount: number;
  startingPrice: number;
};

export type BikeWithDistance = DemoBike & { distanceKm: number };
