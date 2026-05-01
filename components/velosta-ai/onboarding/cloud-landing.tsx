"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Playfair_Display } from "next/font/google";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { MapPin, Sparkles, ArrowRight } from "lucide-react";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const C = {
  navy: "#0B1F2A",
  sand: "#F5EFE6",
  sandLight: "#FBF8F3",
  teal: "#2F6F73",
  tealLight: "#3A8589",
  coral: "#D97757",
  coralDark: "#B85F44",
  mist: "#D9E2E1",
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Iconic destinations to slowly rotate through (urban cities favor 3D buildings)
const DESTINATIONS: { center: [number, number]; zoom: number; label: string; pitch: number; bearing: number }[] = [
  { center: [73.6883, 24.5854], zoom: 14.5, label: "Udaipur",     pitch: 65, bearing: -20 },
  { center: [78.0421, 27.1751], zoom: 16,   label: "Taj Mahal",   pitch: 72, bearing: 35  },
  { center: [76.2673, 10.8505], zoom: 12.5, label: "Munnar",      pitch: 68, bearing: 10  },
  { center: [72.8347, 18.9220], zoom: 15.5, label: "Mumbai",      pitch: 70, bearing: -45 },
  { center: [77.5946, 12.9716], zoom: 15,   label: "Bengaluru",   pitch: 65, bearing: 25  },
  { center: [77.2295, 28.6129], zoom: 15.5, label: "Delhi",       pitch: 70, bearing: -10 },
];

export default function CloudLandingScene() {
  const { setFlowStep } = useOnboardingStore();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const destIndexRef = useRef(0);

  // Initialize background map
  useEffect(() => {
    if (!mapContainerRef.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const startDest = DESTINATIONS[0];
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center: startDest.center,
      zoom: startDest.zoom,
      pitch: startDest.pitch,
      bearing: startDest.bearing,
      antialias: true,
      interactive: false,
      attributionControl: false,
      projection: { name: "globe" } as never,
    });

    map.on("style.load", () => {
      // Mapbox Standard — Apple-grade 3D with realistic buildings, trees, lighting
      try {
        // "dusk" gives warm cinematic light; "dawn" / "day" / "night" are alternatives
        (map as unknown as { setConfigProperty: (a: string, b: string, c: unknown) => void })
          .setConfigProperty("basemap", "lightPreset", "dusk");
        (map as unknown as { setConfigProperty: (a: string, b: string, c: unknown) => void })
          .setConfigProperty("basemap", "show3dObjects", true);
        (map as unknown as { setConfigProperty: (a: string, b: string, c: unknown) => void })
          .setConfigProperty("basemap", "showPointOfInterestLabels", false);
        (map as unknown as { setConfigProperty: (a: string, b: string, c: unknown) => void })
          .setConfigProperty("basemap", "showTransitLabels", false);
        (map as unknown as { setConfigProperty: (a: string, b: string, c: unknown) => void })
          .setConfigProperty("basemap", "showRoadLabels", false);
        (map as unknown as { setConfigProperty: (a: string, b: string, c: unknown) => void })
          .setConfigProperty("basemap", "showPlaceLabels", true);
      } catch {
        // Standard config not available — graceful fallback
      }

      // Atmosphere fog for globe projection
      try {
        map.setFog({
          color: "rgb(245, 239, 230)",
          "high-color": "rgb(11, 31, 42)",
          "horizon-blend": 0.04,
          "space-color": "rgb(8, 14, 22)",
          "star-intensity": 0.4,
        } as never);
      } catch {
        /* noop */
      }

      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Slow fly between destinations
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const interval = setInterval(() => {
      destIndexRef.current = (destIndexRef.current + 1) % DESTINATIONS.length;
      const dest = DESTINATIONS[destIndexRef.current];
      mapRef.current?.flyTo({
        center: dest.center,
        zoom: dest.zoom,
        pitch: dest.pitch,
        bearing: dest.bearing,
        duration: 14000,
        essential: true,
        curve: 1.42,
      });
    }, 16000);

    return () => clearInterval(interval);
  }, [mapReady]);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ backgroundColor: C.navy }}
    >
      {/* Mapbox background — muted, cinematic */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0"
        style={{ width: "100%", height: "100%", zIndex: 0 }}
      />

      {/* Layered overlay — navy wash + sand glow at base */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 1,
          background:
            "linear-gradient(180deg, rgba(11,31,42,0.72) 0%, rgba(11,31,42,0.55) 35%, rgba(11,31,42,0.65) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          zIndex: 1,
          background:
            "radial-gradient(ellipse at 20% 80%, rgba(217,119,87,0.18) 0%, rgba(217,119,87,0) 55%), radial-gradient(ellipse at 80% 20%, rgba(47,111,115,0.22) 0%, rgba(47,111,115,0) 55%)",
        }}
      />

      {/* Faint grain for editorial depth */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          zIndex: 2,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Soft floating pins — now in teal / sand, not amber */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 3 }}
      >
        {[
          { top: "14%", left: "9%", delay: 0, size: 18, color: C.sand },
          { top: "22%", right: "13%", delay: 0.6, size: 15, color: C.tealLight },
          { bottom: "26%", left: "17%", delay: 1.1, size: 17, color: C.coral },
          { bottom: "32%", right: "10%", delay: 1.7, size: 13, color: C.sand },
        ].map((pin, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: pin.top,
              left: pin.left,
              right: pin.right,
              bottom: pin.bottom,
              color: pin.color,
              opacity: 0.45,
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.45, y: [0, -8, 0] }}
            transition={{
              delay: pin.delay,
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <MapPin size={pin.size} strokeWidth={1.5} />
          </motion.div>
        ))}
      </div>

      {/* Center editorial composition */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={{ zIndex: 10 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[720px]"
        >
          {/* Eyebrow — teal pill */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5"
            style={{
              borderColor: "rgba(245,239,230,0.28)",
              backgroundColor: "rgba(245,239,230,0.08)",
              backdropFilter: "blur(10px)",
            }}
          >
            <Sparkles size={13} style={{ color: C.coral }} strokeWidth={2} />
            <span
              className="text-[10.5px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: C.sand }}
            >
              Velosta AI · Spatial Planner
            </span>
          </motion.div>

          {/* Headline — Playfair with italic accent */}
          <h1
            className={`${playfair.className} tracking-tight text-white`}
            style={{
              fontSize: "clamp(2.5rem, 5.5vw, 4.75rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              fontWeight: 500,
            }}
          >
            <span className="block">Where will your</span>
            <span
              className="block italic"
              style={{ color: C.coral, fontWeight: 600 }}
            >
              next journey
            </span>
            <span className="block">begin?</span>
          </h1>

          {/* Subtitle */}
          <motion.p
            className="mx-auto mt-7 max-w-[520px] text-[15px] leading-[1.7] md:text-[16.5px]"
            style={{ color: "rgba(245,239,230,0.78)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.8 }}
          >
            Tell us the shape of your trip: budget, pace, the feeling you&apos;re
            chasing. We&apos;ll map the rest, one destination at a time.
          </motion.p>
        </motion.div>

        {/* Primary CTA — coral pill, landing-page consistent */}
        <motion.button
          onClick={() => setFlowStep("budget")}
          className="group relative mt-10 inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-[14px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
          style={{
            backgroundColor: C.coral,
            boxShadow:
              "0 18px 40px -12px rgba(217,119,87,0.55), 0 6px 14px -4px rgba(217,119,87,0.3)",
          }}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="tracking-[0.02em]">Start planning</span>
          <ArrowRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-1"
            strokeWidth={2.2}
          />
        </motion.button>

        {/* Secondary line — how long it takes */}
        <motion.p
          className="mt-5 text-[11.5px] font-medium uppercase tracking-[0.28em]"
          style={{ color: "rgba(245,239,230,0.55)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.8 }}
        >
          ~ 90 seconds · No credit card
        </motion.p>

        {/* Trio — micro trust signals in editorial tone */}
        <motion.div
          className="mt-14 grid max-w-[560px] grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.9 }}
        >
          {[
            { kpi: "2.4k+", label: "Trips planned" },
            { kpi: "180+", label: "Destinations" },
            { kpi: "4.9 / 5", label: "Traveler rating" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div
                className={`${playfair.className} text-[22px] italic md:text-[26px]`}
                style={{ color: C.sand, fontWeight: 500 }}
              >
                {item.kpi}
              </div>
              <div
                className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.24em]"
                style={{ color: "rgba(245,239,230,0.45)" }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom gradient fade — lifts into FlowChrome step rail */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
        style={{
          zIndex: 4,
          background:
            "linear-gradient(to top, rgba(11,31,42,0.85), rgba(11,31,42,0))",
        }}
      />
    </div>
  );
}
