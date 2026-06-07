import type { Metadata } from "next";

import { BikeRentalPage } from "@/components/bike-rental/bike-rental-page";

export const metadata: Metadata = {
  title: "Bike Rentals Across India | Velosta Mobility",
  description:
    "Rent bikes and scooters across 50+ Indian cities. Search by city and dates — verified fleet, instant booking, transparent pricing.",
};

export default function Page() {
  return <BikeRentalPage />;
}
