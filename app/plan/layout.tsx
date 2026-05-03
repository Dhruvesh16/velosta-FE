import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getSiteName, getSiteUrl } from "@/lib/site-config";

const base = getSiteUrl();
const name = getSiteName();

export const metadata: Metadata = {
  title: "Trip Planner · Start Your Itinerary",
  description:
    "Begin your trip with Velosta: share your travel intent and open the AI trip planner for a personalized, map-based itinerary and budget-aware plan.",
  alternates: { canonical: `${base}/plan` },
  openGraph: {
    title: `Trip planner | ${name}`,
    description:
      "Start planning your trip with Velosta’s conversational trip planner before you open the full AI itinerary builder.",
    url: `${base}/plan`,
    siteName: name,
    type: "website",
    locale: "en_IN",
  },
};

export default function PlanLayout({ children }: { children: ReactNode }) {
  return children;
}
