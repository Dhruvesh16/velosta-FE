/**
 * Layout for /velosta-ai route.
 * Suppresses the global Navbar/Footer to give the spatial planner
 * a full-screen, immersive canvas.
 */
import type { Metadata } from "next";
import { getSiteName, getSiteUrl } from "@/lib/site-config";

const base = getSiteUrl();
const name = getSiteName();

export const metadata: Metadata = {
  title: "AI Trip Planner · Map Itineraries & Budgets",
  description:
    "Velosta AI is an intelligent trip planner: build day-by-day itineraries on a map, tune budgets with AI, and refine your route for vacations, weekends, and India travel.",
  keywords: [
    "AI trip planner",
    "travel planner",
    "itinerary planner",
    "AI travel planner",
    "trip planning",
    "travel AI",
    "India trip planner",
  ],
  alternates: { canonical: `${base}/velosta-ai` },
  openGraph: {
    title: `Velosta AI | AI Trip Planner & Map Itineraries`,
    description:
      "Spatial AI trip planner with live maps, budget intelligence, and editable day-by-day travel plans.",
    url: `${base}/velosta-ai`,
    siteName: name,
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `Velosta AI | AI Trip Planner`,
    description:
      "Map-based AI trip planner with budgets and itineraries you can iterate on in real time.",
  },
};

export default function VelostaAILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Render children directly — no Navbar, no Footer.
  // The shell fills the entire viewport.
  return <>{children}</>;
}

