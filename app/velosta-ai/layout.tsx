/**
 * Layout for /velosta-ai route.
 * Suppresses the global Navbar/Footer to give the spatial planner
 * a full-screen, immersive canvas.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Velosta AI · Spatial Travel Planner",
  description: "Plan your trip spatially with budget intelligence and live itinerary management.",
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

